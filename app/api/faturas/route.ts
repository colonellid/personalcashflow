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

interface TransacaoRaw {
  data: Date
  descricao: string
  categoria: string
  banco: string
  valor: number
  origem: string // col 1 (B) se preenchida
  extra1: string // col 6 (G)
  extra2: string // col 7 (H)
}

function parseAll(rows: string[][]): TransacaoRaw[] {
  return rows
    .map((r) => {
      const data = parseData(r[0])
      if (!data) return null
      const valor = parseBRL(r[4])
      if (valor === 0) return null
      return {
        data,
        origem: r[1] ?? "",
        descricao: r[2] ?? "",
        categoria: r[3] ?? "Outros",
        banco: r[5] ?? "",
        extra1: r[6] ?? "",
        extra2: r[7] ?? "",
        valor,
      }
    })
    .filter((t): t is TransacaoRaw => t !== null)
}

export async function GET() {
  try {
    const rows = await readRange(`${ABAS.TRANSACOES}!A2:H`)
    const transacoes = parseAll(rows)

    // Group by banco + mesAno
    const grupos = new Map<string, {
      banco: string
      mesAnoKey: string
      mesAnoLabel: string
      transacoes: typeof transacoes
    }>()

    for (const t of transacoes) {
      const key = `${t.banco || "Sem banco"}___${mesAnoKey(t.data)}`
      if (!grupos.has(key)) {
        grupos.set(key, {
          banco: t.banco || "Sem banco",
          mesAnoKey: mesAnoKey(t.data),
          mesAnoLabel: mesAnoLabel(t.data),
          transacoes: [],
        })
      }
      grupos.get(key)!.transacoes.push(t)
    }

    const faturas = [...grupos.entries()]
      .sort(([a], [b]) => {
        const [bancoA, mesA] = a.split("___")
        const [bancoB, mesB] = b.split("___")
        if (mesA !== mesB) return mesB.localeCompare(mesA) // mais recente primeiro
        return bancoA.localeCompare(bancoB)
      })
      .map(([id, g]) => {
        const sorted = [...g.transacoes].sort(
          (a, b) => b.data.getTime() - a.data.getTime()
        )
        const gastos = sorted
          .filter((t) => t.valor < 0)
          .reduce((s, t) => s + Math.abs(t.valor), 0)
        const receitas = sorted
          .filter((t) => t.valor > 0)
          .reduce((s, t) => s + t.valor, 0)

        return {
          id,
          banco: g.banco,
          mesAnoKey: g.mesAnoKey,
          mesAnoLabel: g.mesAnoLabel,
          count: sorted.length,
          gastos,
          receitas,
          saldo: receitas - gastos,
          transacoes: sorted.map((t) => ({
            data: t.data.toISOString().slice(0, 10),
            descricao: t.descricao,
            categoria: t.categoria,
            banco: t.banco,
            origem: t.origem,
            extra1: t.extra1,
            extra2: t.extra2,
            valor: t.valor,
          })),
        }
      })

    return NextResponse.json({ data: { faturas } })
  } catch (error) {
    return NextResponse.json(
      { error: { code: "FATURAS_FAILED", message: String(error) } },
      { status: 500 },
    )
  }
}
