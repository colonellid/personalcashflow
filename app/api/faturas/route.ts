import { NextResponse } from "next/server"
import { readRange } from "@/lib/google/sheets"
import { parseData } from "@/lib/utils/parse-date"
import { ABAS } from "@/lib/constants"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function parseBRL(raw: unknown): number {
  if (typeof raw === "number") return raw
  if (typeof raw !== "string") return 0
  const clean = raw.replace(/[R$\s.]/g, "").replace(",", ".")
  const n = parseFloat(clean)
  return isNaN(n) ? 0 : n
}

function mesAnoKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function mesAnoLabel(date: Date): string {
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
}

function diaKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// Detecta tipo da transação: tenta coluna B (r[1]), depois colunas extras,
// depois padrão no campo banco.
function detectTipo(r: string[]): "fatura" | "extrato" | "outro" {
  const candidates = [r[1], r[6], r[7], r[8], r[9], r[10], r[11]]
  for (const c of candidates) {
    if (!c) continue
    const v = c.toLowerCase()
    if (v.includes("fatura") || v.includes("cartao") || v.includes("cartão") || v.includes("crédito") || v.includes("credito")) return "fatura"
    if (v.includes("extrato") || v.includes("conta") || v.includes("corrente") || v.includes("débito") || v.includes("debito")) return "extrato"
  }
  const banco = (r[5] ?? "").toLowerCase()
  if (banco.includes("fatura") || banco.includes("cartao") || banco.includes("cartão")) return "fatura"
  if (banco.includes("extrato") || banco.includes("conta")) return "extrato"
  return "outro"
}

export async function GET() {
  try {
    // Lê até coluna L para capturar campos extras que o Apps Script pode escrever
    const rows = await readRange(`${ABAS.TRANSACOES}!A2:L`)

    type RawTx = {
      data: Date
      dataKey: string
      descricao: string
      categoria: string
      banco: string
      tipo: "fatura" | "extrato" | "outro"
      // colunas extras expostas para debug
      colB: string
      colG: string
      colH: string
      colI: string
      colJ: string
      colK: string
      colL: string
      rawValor: number
    }

    const transacoes: RawTx[] = rows
      .map((r) => {
        const data = parseData(r[0])
        if (!data) return null
        const rawValor = parseBRL(r[4])
        if (rawValor === 0) return null
        return {
          data,
          dataKey: diaKey(data),
          descricao: r[2] ?? "",
          categoria: r[3] ?? "Outros",
          banco: r[5] ?? "",
          tipo: detectTipo(r),
          colB: r[1] ?? "",
          colG: r[6] ?? "",
          colH: r[7] ?? "",
          colI: r[8] ?? "",
          colJ: r[9] ?? "",
          colK: r[10] ?? "",
          colL: r[11] ?? "",
          rawValor,
        }
      })
      .filter((t): t is RawTx => t !== null)

    // Para faturas de cartão: valor positivo no CSV = compra = gasto.
    // Normaliza: gastos sempre negativos, receitas sempre positivas.
    function valorNormalizado(t: RawTx): number {
      if (t.tipo === "fatura") {
        // Compra = positivo no CSV C6 → converte para negativo (gasto)
        return t.rawValor > 0 ? -t.rawValor : t.rawValor
      }
      return t.rawValor
    }

    // Agrupa por banco + tipo + mesAno
    const grupoKey = (t: RawTx) =>
      `${t.banco || "—"}|||${t.tipo}|||${mesAnoKey(t.data)}`

    const grupos = new Map<string, {
      banco: string
      tipo: "fatura" | "extrato" | "outro"
      mesAnoKey: string
      mesAnoLabel: string
      txs: RawTx[]
    }>()

    for (const t of transacoes) {
      const k = grupoKey(t)
      if (!grupos.has(k)) {
        grupos.set(k, {
          banco: t.banco || "—",
          tipo: t.tipo,
          mesAnoKey: mesAnoKey(t.data),
          mesAnoLabel: mesAnoLabel(t.data),
          txs: [],
        })
      }
      grupos.get(k)!.txs.push(t)
    }

    const faturas = [...grupos.entries()]
      .sort(([a], [b]) => {
        const mesA = a.split("|||")[2]
        const mesB = b.split("|||")[2]
        if (mesA !== mesB) return mesB.localeCompare(mesA)
        return a.localeCompare(b)
      })
      .map(([id, g]) => {
        const sorted = [...g.txs].sort((a, b) => b.data.getTime() - a.data.getTime())

        // Agrupa por dia
        const diaMap = new Map<string, RawTx[]>()
        for (const t of sorted) {
          const dk = t.dataKey
          if (!diaMap.has(dk)) diaMap.set(dk, [])
          diaMap.get(dk)!.push(t)
        }

        const dias = [...diaMap.entries()]
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([dk, txs]) => {
            const normalizado = txs.map((t) => valorNormalizado(t))
            const gastosDia = normalizado.filter((v) => v < 0).reduce((s, v) => s + Math.abs(v), 0)
            const receitasDia = normalizado.filter((v) => v > 0).reduce((s, v) => s + v, 0)
            return {
              dataKey: dk,
              gastos: gastosDia,
              receitas: receitasDia,
              saldo: receitasDia - gastosDia,
              transacoes: txs.map((t) => {
                const v = valorNormalizado(t)
                return {
                  data: t.dataKey,
                  descricao: t.descricao,
                  categoria: t.categoria,
                  banco: t.banco,
                  tipo: t.tipo,
                  valor: v,
                  valorOriginal: t.rawValor,
                  // campos extras do Apps Script (para debug)
                  meta: [t.colB, t.colG, t.colH, t.colI, t.colJ, t.colK, t.colL]
                    .filter(Boolean)
                    .join(" · ") || null,
                }
              }),
            }
          })

        const todosValores = sorted.map((t) => valorNormalizado(t))
        const gastos = todosValores.filter((v) => v < 0).reduce((s, v) => s + Math.abs(v), 0)
        const receitas = todosValores.filter((v) => v > 0).reduce((s, v) => s + v, 0)

        return {
          id,
          banco: g.banco,
          tipo: g.tipo,
          mesAnoKey: g.mesAnoKey,
          mesAnoLabel: g.mesAnoLabel,
          count: sorted.length,
          gastos,
          receitas,
          saldo: receitas - gastos,
          dias,
        }
      })

    // Tipos presentes nos dados (para o filtro dinâmico)
    const tiposPresentes = [...new Set(faturas.map((f) => f.tipo))]
    const bancosPresentes = [...new Set(faturas.map((f) => f.banco))]

    return NextResponse.json({
      data: {
        faturas,
        meta: { tiposPresentes, bancosPresentes },
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: { code: "FATURAS_FAILED", message: String(error) } },
      { status: 500 },
    )
  }
}
