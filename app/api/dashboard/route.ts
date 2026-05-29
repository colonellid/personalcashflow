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

function mesLabel(date: Date): string {
  return date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")
}

function mesAnoKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

interface Transacao {
  data: Date
  descricao: string
  categoria: string
  banco: string
  valor: number
}

interface Projecao {
  data: Date
  descricao: string
  categoria: string
  valor: number
}

function parseTransacoes(rows: string[][]): Transacao[] {
  return rows
    .map((r) => {
      const data = parseData(r[0])
      if (!data) return null
      const valor = parseBRL(r[4])
      if (valor === 0) return null
      return {
        data,
        descricao: r[2] ?? "",
        categoria: r[3] ?? "Outros",
        banco: r[5] ?? "",
        valor,
      }
    })
    .filter((t): t is Transacao => t !== null)
}

function parseProjecoes(rows: string[][]): Projecao[] {
  return rows
    .map((r) => {
      const data = parseData(r[0])
      if (!data) return null
      const valor = parseBRL(r[4])
      if (valor === 0) return null
      return {
        data,
        descricao: r[2] ?? "",
        categoria: r[3] ?? "Outros",
        valor,
      }
    })
    .filter((p): p is Projecao => p !== null)
}

export async function GET() {
  try {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const mesAtualKey = mesAnoKey(hoje)

    const [transRows, projRows] = await Promise.all([
      readRange(`${ABAS.TRANSACOES}!A2:H`),
      readRange(`${ABAS.PROJECOES}!A2:H`),
    ])

    const transacoes = parseTransacoes(transRows)
    const projecoes = parseProjecoes(projRows)

    // --- resumo do mês atual ---
    const doMesAtual = transacoes.filter((t) => mesAnoKey(t.data) === mesAtualKey)

    const receitasMes = doMesAtual
      .filter((t) => t.valor > 0)
      .reduce((s, t) => s + t.valor, 0)

    const gastosMes = Math.abs(
      doMesAtual.filter((t) => t.valor < 0).reduce((s, t) => s + t.valor, 0),
    )

    const saldoMes = receitasMes - gastosMes

    const projetadoMes = Math.abs(
      projecoes
        .filter((p) => mesAnoKey(p.data) === mesAtualKey && p.valor < 0)
        .reduce((s, p) => s + p.valor, 0),
    )

    const mesAnoLabel = hoje.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    })

    // --- fluxo mensal — últimos 6 meses ---
    const fluxoMensal: Array<{ mesLabel: string; receitas: number; gastos: number }> = []

    for (let i = 5; i >= 0; i--) {
      const ref = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      const key = mesAnoKey(ref)
      const label = mesLabel(ref)
      const doMes = transacoes.filter((t) => mesAnoKey(t.data) === key)
      fluxoMensal.push({
        mesLabel: label,
        receitas: doMes.filter((t) => t.valor > 0).reduce((s, t) => s + t.valor, 0),
        gastos: Math.abs(
          doMes.filter((t) => t.valor < 0).reduce((s, t) => s + t.valor, 0),
        ),
      })
    }

    // --- distribuição por categoria (gastos do mês atual) ---
    const gastosPorCat = new Map<string, number>()
    for (const t of doMesAtual.filter((t) => t.valor < 0)) {
      const cat = t.categoria || "Outros"
      gastosPorCat.set(cat, (gastosPorCat.get(cat) ?? 0) + Math.abs(t.valor))
    }
    const totalGastos = [...gastosPorCat.values()].reduce((s, v) => s + v, 0)
    const transacoesPorCategoria = [...gastosPorCat.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([categoria, valor]) => ({
        categoria,
        valor,
        pct: totalGastos > 0 ? Math.round((valor / totalGastos) * 100) : 0,
      }))

    // --- últimas 15 transações ---
    const ultimasTransacoes = [...transacoes]
      .sort((a, b) => b.data.getTime() - a.data.getTime())
      .slice(0, 15)
      .map((t) => ({
        data: t.data.toISOString().slice(0, 10),
        descricao: t.descricao,
        categoria: t.categoria,
        banco: t.banco,
        valor: t.valor,
      }))

    // --- próximas 15 projeções (data >= hoje) ---
    const proxProjecoes = projecoes
      .filter((p) => p.data >= hoje)
      .sort((a, b) => a.data.getTime() - b.data.getTime())
      .slice(0, 15)
      .map((p) => ({
        data: p.data.toISOString().slice(0, 10),
        descricao: p.descricao,
        categoria: p.categoria,
        tipo: p.valor >= 0 ? "Receita" : "Despesa",
        valor: p.valor,
      }))

    return NextResponse.json({
      data: {
        resumo: {
          mesAno: mesAnoLabel,
          receitasMes,
          gastosMes,
          saldoMes,
          projetadoMes,
        },
        fluxoMensal,
        transacoesPorCategoria,
        ultimasTransacoes,
        proxProjecoes,
        atualizadoEm: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: { code: "DASHBOARD_FAILED", message: String(error) } },
      { status: 500 },
    )
  }
}