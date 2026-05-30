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
      return { data, descricao: r[2] ?? "", categoria: r[3] ?? "Outros", banco: r[5] ?? "", valor }
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
      return { data, descricao: r[2] ?? "", categoria: r[3] ?? "Outros", valor }
    })
    .filter((p): p is Projecao => p !== null)
}

// ── Parcelamento detection ────────────────────────────────────────────────────
const PARCELA_RE = /^(.*?)\s+(\d{1,2})\/(\d{1,2})\s*$/

interface Parcelamento {
  descricao: string
  parcelaAtual: number
  totalParcelas: number
  valorParcela: number
  banco: string
  pago: number
  restante: number
  status: "ativo" | "finalizado"
  ultimaData: string
}

function detectParcelamentos(transacoes: Transacao[]): Parcelamento[] {
  type Entry = { t: Transacao; n: number; total: number }
  const grupos = new Map<string, Entry[]>()

  for (const t of transacoes) {
    if (t.valor >= 0) continue
    const m = t.descricao.match(PARCELA_RE)
    if (!m) continue
    const [, base, nStr, totalStr] = m
    const n = parseInt(nStr, 10)
    const total = parseInt(totalStr, 10)
    const bucket = Math.round(Math.abs(t.valor) / 5) * 5
    const key = `${base.trim()}|||${total}|||${t.banco}|||${bucket}`
    if (!grupos.has(key)) grupos.set(key, [])
    grupos.get(key)!.push({ t, n, total })
  }

  const result: Parcelamento[] = []
  for (const [key, entries] of grupos) {
    const sorted = [...entries].sort((a, b) => b.t.data.getTime() - a.t.data.getTime())
    const latest = sorted[0]
    const valorParcela = Math.abs(latest.t.valor)
    const totalParcelas = latest.total
    const parcelaAtual = latest.n
    const pago = entries.reduce((s, e) => s + Math.abs(e.t.valor), 0)
    const restante = Math.max(0, (totalParcelas - parcelaAtual) * valorParcela)
    const [base, , banco] = key.split("|||")
    result.push({
      descricao: base,
      parcelaAtual,
      totalParcelas,
      valorParcela,
      banco,
      pago,
      restante,
      status: parcelaAtual >= totalParcelas ? "finalizado" : "ativo",
      ultimaData: latest.t.data.toISOString().slice(0, 10),
    })
  }

  return result.sort((a, b) => {
    if (a.status !== b.status) return a.status === "ativo" ? -1 : 1
    return b.restante - a.restante
  })
}

// ── Subscription detection ────────────────────────────────────────────────────
interface Assinatura {
  descricao: string
  valorMensal: number
  banco: string
  proximaData: string
  pagamentos: number
}

function detectAssinaturas(transacoes: Transacao[]): Assinatura[] {
  const grupos = new Map<string, Transacao[]>()
  for (const t of transacoes) {
    if (t.valor >= 0) continue
    if (PARCELA_RE.test(t.descricao)) continue
    const key = `${t.descricao.substring(0, 32).trim()}|||${t.banco}`
    if (!grupos.has(key)) grupos.set(key, [])
    grupos.get(key)!.push(t)
  }

  const result: Assinatura[] = []
  for (const [, txs] of grupos) {
    const months = new Set(txs.map((t) => mesAnoKey(t.data)))
    if (months.size < 2) continue
    const amounts = txs.map((t) => Math.abs(t.valor))
    const avg = amounts.reduce((s, v) => s + v, 0) / amounts.length
    const consistent = amounts.every((a) => avg === 0 || Math.abs(a - avg) / avg < 0.15)
    if (!consistent) continue
    const sorted = [...txs].sort((a, b) => b.data.getTime() - a.data.getTime())
    const latest = sorted[0]
    const next = new Date(latest.data)
    next.setMonth(next.getMonth() + 1)
    result.push({
      descricao: latest.descricao,
      valorMensal: avg,
      banco: latest.banco,
      proximaData: next.toISOString().slice(0, 10),
      pagamentos: txs.length,
    })
  }

  return result.sort((a, b) => b.valorMensal - a.valorMensal)
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const mesAtualKey = mesAnoKey(hoje)
    const mesAnteriorRef = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
    const mesAnteriorKey = mesAnoKey(mesAnteriorRef)

    const [transRows, projRows] = await Promise.all([
      readRange(`${ABAS.TRANSACOES}!A2:H`),
      readRange(`${ABAS.PROJECOES}!A2:H`),
    ])

    const transacoes = parseTransacoes(transRows)
    const projecoes = parseProjecoes(projRows)

    const doMesAtual = transacoes.filter((t) => mesAnoKey(t.data) === mesAtualKey)
    const doMesAnterior = transacoes.filter((t) => mesAnoKey(t.data) === mesAnteriorKey)

    // ── Resumo ────────────────────────────────────────────────────────────────
    const receitasMes = doMesAtual.filter((t) => t.valor > 0).reduce((s, t) => s + t.valor, 0)
    const gastosMes = Math.abs(doMesAtual.filter((t) => t.valor < 0).reduce((s, t) => s + t.valor, 0))
    const saldoMes = receitasMes - gastosMes
    const projetadoMes = Math.abs(
      projecoes.filter((p) => mesAnoKey(p.data) === mesAtualKey && p.valor < 0).reduce((s, p) => s + p.valor, 0),
    )
    const gastosMesAnterior = Math.abs(
      doMesAnterior.filter((t) => t.valor < 0).reduce((s, t) => s + t.valor, 0),
    )
    const variacao = gastosMesAnterior > 0 ? Math.round(((gastosMes - gastosMesAnterior) / gastosMesAnterior) * 100) : 0

    // Daily map for current month
    const dailyMap = new Map<number, number>()
    for (const t of doMesAtual) {
      if (t.valor < 0) {
        const d = t.data.getDate()
        dailyMap.set(d, (dailyMap.get(d) ?? 0) + Math.abs(t.valor))
      }
    }

    let maiorGastoDia = 0
    let maiorGastoValor = 0
    for (const [d, v] of dailyMap) {
      if (v > maiorGastoValor) { maiorGastoValor = v; maiorGastoDia = d }
    }

    const mesAnoLabel = hoje.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })

    // ── Fluxo mensal — 6 meses ────────────────────────────────────────────────
    const fluxoMensal: Array<{ mesLabel: string; receitas: number; gastos: number }> = []
    for (let i = 5; i >= 0; i--) {
      const ref = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      const key = mesAnoKey(ref)
      const doMes = transacoes.filter((t) => mesAnoKey(t.data) === key)
      fluxoMensal.push({
        mesLabel: mesLabel(ref),
        receitas: doMes.filter((t) => t.valor > 0).reduce((s, t) => s + t.valor, 0),
        gastos: Math.abs(doMes.filter((t) => t.valor < 0).reduce((s, t) => s + t.valor, 0)),
      })
    }

    // ── Categorias (atual + anterior + comparação) ────────────────────────────
    const gastosPorCat = new Map<string, number>()
    for (const t of doMesAtual.filter((t) => t.valor < 0)) {
      const cat = t.categoria || "Outros"
      gastosPorCat.set(cat, (gastosPorCat.get(cat) ?? 0) + Math.abs(t.valor))
    }
    const gastosPorCatAnterior = new Map<string, number>()
    for (const t of doMesAnterior.filter((t) => t.valor < 0)) {
      const cat = t.categoria || "Outros"
      gastosPorCatAnterior.set(cat, (gastosPorCatAnterior.get(cat) ?? 0) + Math.abs(t.valor))
    }
    const totalGastos = [...gastosPorCat.values()].reduce((s, v) => s + v, 0)

    const transacoesPorCategoria = [...gastosPorCat.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([categoria, valor]) => ({
        categoria,
        valor,
        pct: totalGastos > 0 ? Math.round((valor / totalGastos) * 100) : 0,
      }))

    const categoriaComparacao = [...gastosPorCat.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([categoria, valor]) => {
        const anterior = gastosPorCatAnterior.get(categoria) ?? 0
        const variacao = anterior > 0 ? Math.round(((valor - anterior) / anterior) * 100) : null
        return { categoria, valor, pct: totalGastos > 0 ? Math.round((valor / totalGastos) * 100) : 0, anterior, variacao }
      })

    // ── Insight ───────────────────────────────────────────────────────────────
    const biggestChange = categoriaComparacao
      .filter((c) => c.anterior > 0 && c.variacao !== null)
      .sort((a, b) => Math.abs(b.variacao ?? 0) - Math.abs(a.variacao ?? 0))[0]

    let insightTitulo = "Pronto para entender seu fluxo?"
    let insightDescricao = `Deyvid, você tem ${transacoes.length} lançamentos registrados.`
    if (biggestChange && biggestChange.variacao !== null) {
      const dir = biggestChange.variacao > 0 ? "subiram" : "caíram"
      insightDescricao = `Deyvid, seus gastos em ${biggestChange.categoria} ${dir} ${Math.abs(biggestChange.variacao)}%! Bora revisar esse fluxo?`
      insightTitulo = biggestChange.variacao > 0
        ? "Atenção: gasto acima do habitual"
        : "Boa notícia: gasto sob controle"
    }

    // ── Gasto diário (heatmap + ritmo) ────────────────────────────────────────
    const diasNoMes = hoje.getDate()
    let acum = 0
    const gastoDiario = Array.from({ length: diasNoMes }, (_, i) => {
      const d = i + 1
      const diario = dailyMap.get(d) ?? 0
      acum += diario
      return { dia: d, diario, acumulado: acum }
    })

    // Previous month — full month
    const dailyPrevMap = new Map<number, number>()
    for (const t of doMesAnterior) {
      if (t.valor < 0) {
        const d = t.data.getDate()
        dailyPrevMap.set(d, (dailyPrevMap.get(d) ?? 0) + Math.abs(t.valor))
      }
    }
    const diasPrevio = new Date(mesAnteriorRef.getFullYear(), mesAnteriorRef.getMonth() + 1, 0).getDate()
    let acumPrev = 0
    const gastoDiarioPrevio = Array.from({ length: diasPrevio }, (_, i) => {
      const d = i + 1
      acumPrev += dailyPrevMap.get(d) ?? 0
      return { dia: d, acumulado: acumPrev }
    })

    // ── Últimas transações ────────────────────────────────────────────────────
    const ultimasTransacoes = [...transacoes]
      .sort((a, b) => b.data.getTime() - a.data.getTime())
      .slice(0, 20)
      .map((t) => ({ data: t.data.toISOString().slice(0, 10), descricao: t.descricao, categoria: t.categoria, banco: t.banco, valor: t.valor }))

    // ── Projeções ─────────────────────────────────────────────────────────────
    const proxProjecoes = projecoes
      .filter((p) => p.data >= hoje)
      .sort((a, b) => a.data.getTime() - b.data.getTime())
      .slice(0, 15)
      .map((p) => ({ data: p.data.toISOString().slice(0, 10), descricao: p.descricao, categoria: p.categoria, tipo: p.valor >= 0 ? "Receita" : "Despesa", valor: p.valor }))

    // ── Parcelamentos & Assinaturas ───────────────────────────────────────────
    const parcelamentos = detectParcelamentos(transacoes)
    const assinaturas = detectAssinaturas(transacoes)
    const totalAssinaturas = assinaturas.reduce((s, a) => s + a.valorMensal, 0)

    return NextResponse.json({
      data: {
        resumo: { mesAno: mesAnoLabel, receitasMes, gastosMes, saldoMes, projetadoMes, variacao, maiorGastoDia, maiorGastoValor, totalAssinaturas },
        fluxoMensal,
        transacoesPorCategoria,
        categoriaComparacao,
        ultimasTransacoes,
        proxProjecoes,
        gastoDiario,
        gastoDiarioPrevio,
        parcelamentos,
        assinaturas,
        insight: { titulo: insightTitulo, descricao: insightDescricao },
        atualizadoEm: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json({ error: { code: "DASHBOARD_FAILED", message: String(error) } }, { status: 500 })
  }
}
