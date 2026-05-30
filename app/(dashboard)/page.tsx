"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  LayoutDashboard, ArrowLeftRight, CreditCard, Repeat2, Tag,
  RefreshCw, ChevronDown, ChevronRight, Upload, AlertCircle,
} from "lucide-react"
import { useDashboard, type DashboardData } from "@/hooks/use-dashboard"
import { useFaturas, type FaturaGroup, type DiaGroup } from "@/hooks/use-faturas"
import { Loader } from "@/components/loader"
import { CategoriaDonut } from "@/components/charts/categoria-donut"
import { RitmoGastosChart } from "@/components/charts/ritmo-gastos"
import { HeatmapCalendar } from "@/components/heatmap-calendar"
import { formatBRL } from "@/lib/format"

type Tab = "visao-geral" | "transacoes" | "parcelamentos" | "assinaturas" | "categorias"

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDateBR(iso: string) {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

function fmtDiaLabel(iso: string) {
  const date = new Date(iso + "T12:00:00")
  return date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })
}

function avatarColor(str: string): string {
  const colors = ["bg-accent/30 text-accent", "bg-teal/20 text-teal", "bg-yellow/20 text-yellow", "bg-red/20 text-red", "bg-blue/20 text-blue"]
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function Avatar({ name }: { name: string }) {
  const letter = (name || "?")[0].toUpperCase()
  return (
    <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm font-bold ${avatarColor(name)}`}>
      {letter}
    </div>
  )
}

function fmtProxData(iso: string) {
  const d = new Date(iso + "T12:00:00")
  return `${d.getDate()} ${d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}`
}

// ── Tab Nav ───────────────────────────────────────────────────────────────────

const TABS: Array<{ id: Tab; label: string; Icon: React.ElementType }> = [
  { id: "visao-geral", label: "Visão geral", Icon: LayoutDashboard },
  { id: "transacoes", label: "Transações", Icon: ArrowLeftRight },
  { id: "parcelamentos", label: "Parcelamentos", Icon: CreditCard },
  { id: "assinaturas", label: "Assinaturas", Icon: Repeat2 },
  { id: "categorias", label: "Categorias", Icon: Tag },
]

function TabNav({ active, onChange, onRefresh, isFetching }: {
  active: Tab; onChange: (t: Tab) => void; onRefresh: () => void; isFetching: boolean
}) {
  return (
    <nav className="sticky top-0 z-[100] border-b border-border bg-surface">
      <div className="mx-auto max-w-[var(--container-page)] px-4 sm:px-6 lg:px-8 h-[60px] flex items-center justify-between gap-4">
        {/* logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-[10px] bg-accent/15 border border-accent/20 flex items-center justify-center text-[14px]">💰</div>
          <span className="text-[13px] font-extrabold tracking-tight hidden sm:block">Personal Cashflow</span>
        </div>

        {/* tabs centered */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 justify-center">
          {TABS.map(({ id, label, Icon }) => {
            const isActive = active === id
            return (
              <button
                key={id}
                onClick={() => onChange(id)}
                className={[
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border",
                  isActive
                    ? "bg-accent/15 text-text border-accent/35"
                    : "text-muted border-transparent hover:text-text hover:bg-white/[.04]",
                ].join(" ")}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            )
          })}
        </div>

        {/* actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRefresh}
            disabled={isFetching}
            className="flex items-center gap-1 text-xs text-muted hover:text-text disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
          </button>
          <Link href="/upload" className="pill pill-teal text-[11px] hidden sm:inline-flex">
            <Upload size={11} className="mr-1" />
            CSV
          </Link>
        </div>
      </div>
    </nav>
  )
}

// ── Visão Geral ───────────────────────────────────────────────────────────────

function VisaoGeral({ data, dataUpdatedAt }: { data: DashboardData; dataUpdatedAt: number | undefined }) {
  const { resumo, insight, gastoDiario, gastoDiarioPrevio, categoriaComparacao, ultimasTransacoes, assinaturas } = data
  const hoje = new Date()

  const lastUpdate = dataUpdatedAt
    ? `Atualizado às ${new Date(dataUpdatedAt).toLocaleTimeString("pt-BR")}`
    : "—"

  // Group recent transactions by day
  const transacoesPorDia = useMemo(() => {
    const map = new Map<string, typeof ultimasTransacoes>()
    for (const t of ultimasTransacoes.slice(0, 12)) {
      if (!map.has(t.data)) map.set(t.data, [])
      map.get(t.data)!.push(t)
    }
    return [...map.entries()].slice(0, 4)
  }, [ultimasTransacoes])

  const diaLabel = (iso: string) => {
    const d = new Date(iso + "T12:00:00")
    const todayStr = hoje.toISOString().slice(0, 10)
    const yesterdayStr = new Date(hoje.getTime() - 86400000).toISOString().slice(0, 10)
    if (iso === todayStr) return "HOJE"
    if (iso === yesterdayStr) return "ONTEM"
    return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).toUpperCase().replace(".", "")
  }

  return (
    <main className="mx-auto max-w-[var(--container-page)] px-4 sm:px-6 lg:px-8 pt-5 pb-16">
      {/* Row 1: Insight + Ritmo */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-4 mb-4">
        {/* Insight card */}
        <div className="card p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-teal/[.06] to-transparent pointer-events-none" />
          <h2 className="text-lg font-extrabold text-teal mb-1 relative">{insight.titulo}</h2>
          <p className="text-sm text-muted mb-5 relative leading-relaxed">{insight.descricao}</p>

          <div className="grid grid-cols-3 gap-3 relative mb-4">
            <div className="bg-bg/60 rounded-xl p-3">
              <p className="text-[10px] text-muted uppercase tracking-wide mb-1">Gasto em {hoje.toLocaleDateString("pt-BR", { month: "long" })}</p>
              <p className="text-base font-extrabold">{formatBRL(resumo.gastosMes)}</p>
            </div>
            <div className="bg-bg/60 rounded-xl p-3">
              <p className="text-[10px] text-muted uppercase tracking-wide mb-1">Vs. mês anterior</p>
              <p className={`text-base font-extrabold ${resumo.variacao > 0 ? "text-red" : "text-teal"}`}>
                {resumo.variacao > 0 ? "↑" : "↓"} {Math.abs(resumo.variacao)}%
              </p>
            </div>
            <div className="bg-bg/60 rounded-xl p-3">
              <p className="text-[10px] text-muted uppercase tracking-wide mb-1">Maior gasto</p>
              <p className="text-base font-extrabold">{formatBRL(resumo.maiorGastoValor)}</p>
              <p className="text-[10px] text-muted">dia {resumo.maiorGastoDia}</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted/60 relative">
            <span>{lastUpdate}</span>
            <Link href="/faturas" className="text-accent hover:underline">Ver faturas →</Link>
          </div>
        </div>

        {/* Ritmo de gastos */}
        <div className="card p-5">
          <div className="flex items-start justify-between mb-1">
            <p className="text-[10px] text-muted uppercase tracking-widest font-semibold">Ritmo de Gastos</p>
          </div>
          <p className="text-2xl font-extrabold mb-0.5">{formatBRL(resumo.gastosMes)}</p>
          <div className="flex items-center gap-2 mb-4">
            <span className={`pill text-[11px] ${resumo.variacao > 0 ? "pill-red" : "pill-green"}`}>
              {resumo.variacao > 0 ? "↑" : "↓"} {Math.abs(resumo.variacao)}%
            </span>
            <span className="text-[11px] text-muted">
              vs {formatBRL(resumo.gastosMes / (1 + resumo.variacao / 100))} mês anterior
            </span>
          </div>
          <RitmoGastosChart dataAtual={gastoDiario} dataPrevio={gastoDiarioPrevio} />
          <div className="flex items-center gap-4 mt-3 text-[11px] text-muted">
            <span className="flex items-center gap-1.5"><span className="inline-block w-6 h-0.5 bg-teal rounded" /> Este mês</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-6 h-0.5 border-b border-dashed border-muted" /> Mês passado</span>
          </div>
        </div>
      </div>

      {/* Row 2: Heatmap + Categorias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Heatmap */}
        <div className="card p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-0.5">Mapa de Calor</p>
              <p className="text-xl font-extrabold">{formatBRL(resumo.gastosMes)}</p>
              <p className="text-[11px] text-muted">
                Média diária: {formatBRL(gastoDiario.length > 0 ? resumo.gastosMes / gastoDiario.length : 0)}
              </p>
            </div>
          </div>
          <HeatmapCalendar
            data={gastoDiario}
            hoje={hoje.getDate()}
            mes={hoje.getMonth()}
            ano={hoje.getFullYear()}
          />
        </div>

        {/* Principais categorias */}
        <div className="card p-5">
          <div className="flex items-start justify-between mb-4">
            <p className="text-[10px] text-muted uppercase tracking-widest font-semibold">Principais Categorias</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[10px] text-muted font-semibold pb-2 pr-3">Categoria</th>
                  <th className="text-right text-[10px] text-muted font-semibold pb-2 pr-3">Atual</th>
                  <th className="text-[10px] text-muted font-semibold pb-2 pr-3 hidden sm:table-cell">vs Anterior</th>
                  <th className="text-right text-[10px] text-muted font-semibold pb-2">Variação</th>
                </tr>
              </thead>
              <tbody>
                {categoriaComparacao.slice(0, 6).map((c) => (
                  <tr key={c.categoria} className="border-b border-border/40 last:border-0">
                    <td className="py-2.5 pr-3">
                      <span className="font-medium">{c.categoria}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-semibold whitespace-nowrap">
                      {formatBRL(c.valor)}
                    </td>
                    <td className="py-2.5 pr-3 hidden sm:table-cell">
                      <div className="w-full bg-border rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${c.variacao !== null && c.variacao > 0 ? "bg-red" : "bg-teal"}`}
                          style={{ width: `${Math.min(c.pct, 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-2.5 text-right">
                      {c.variacao !== null ? (
                        <span className={`pill text-[10px] ${c.variacao > 0 ? "pill-red" : "pill-green"}`}>
                          {c.variacao > 0 ? "↑" : "↓"}{Math.abs(c.variacao)}%
                        </span>
                      ) : (
                        <span className="text-muted text-[10px]">novo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Row 3: Transações recentes + Assinaturas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Transações recentes */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] text-muted uppercase tracking-widest font-semibold">Transações Recentes</p>
            <button onClick={() => {}} className="text-[11px] text-accent hover:underline" aria-label="ver todas">
              ver todas →
            </button>
          </div>
          <div className="space-y-3">
            {transacoesPorDia.map(([data, txs]) => (
              <div key={data}>
                <p className="text-[10px] text-muted font-semibold uppercase tracking-wider mb-1.5">{diaLabel(data)}</p>
                {txs.map((t, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5">
                    <Avatar name={t.descricao} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.descricao || "—"}</p>
                      <span className={`pill text-[10px] mt-0.5 inline-flex ${t.valor < 0 ? "pill-red" : "pill-green"}`}>
                        {t.categoria}
                      </span>
                    </div>
                    <span className={`text-sm font-semibold shrink-0 ${t.valor >= 0 ? "text-teal" : ""}`}>
                      {t.valor >= 0 ? "+" : ""}{formatBRL(t.valor)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Assinaturas preview */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-muted uppercase tracking-widest font-semibold">Assinaturas</p>
          </div>
          <div className="mb-4">
            <p className="text-2xl font-extrabold">{formatBRL(resumo.totalAssinaturas)}</p>
            <p className="text-[11px] text-muted">/mês · {assinaturas.length} ativas</p>
          </div>
          <div className="space-y-3">
            {assinaturas.slice(0, 4).map((a, i) => (
              <div key={i} className="flex items-center gap-3">
                <Avatar name={a.descricao} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.descricao}</p>
                  <p className="text-[11px] text-muted">Próximo: {fmtProxData(a.proximaData)} · {a.pagamentos} pagamentos</p>
                </div>
                <span className="text-sm font-semibold shrink-0">{formatBRL(a.valorMensal)}<span className="text-[10px] text-muted">/mês</span></span>
              </div>
            ))}
            {assinaturas.length > 4 && (
              <p className="text-[11px] text-muted">+{assinaturas.length - 4} assinaturas</p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

// ── Transações Tab ────────────────────────────────────────────────────────────

function DiaSection({ dia, tipo }: { dia: DiaGroup; tipo: FaturaGroup["tipo"] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border/40 last:border-0">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-white/[.025] transition-colors">
        <span className="text-muted shrink-0">{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
        <span className="text-xs font-semibold text-muted w-[120px] shrink-0">{fmtDiaLabel(dia.dataKey)}</span>
        <span className="text-xs text-muted">{dia.transacoes.length} lançamento{dia.transacoes.length !== 1 ? "s" : ""}</span>
        <div className="ml-auto flex items-center gap-4 shrink-0">
          {dia.receitas > 0 && tipo !== "fatura" && <span className="text-xs text-teal hidden sm:inline">+{formatBRL(dia.receitas)}</span>}
          <span className={`text-xs font-semibold ${dia.gastos > 0 ? "text-red" : "text-muted"}`}>-{formatBRL(dia.gastos)}</span>
        </div>
      </button>
      {open && (
        <div className="pb-1">
          {dia.transacoes.map((t, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-2 hover:bg-white/[.02] transition-colors">
              <span className="w-4 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{t.descricao || "—"}</div>
                <div className="text-[11px] text-muted mt-0.5">{t.categoria}</div>
              </div>
              <span className={`inline-flex min-w-[96px] justify-center pill text-[12px] shrink-0 ${t.valor >= 0 ? "pill-green" : "pill-red"}`}>
                {t.valor >= 0 ? "+" : "−"} {formatBRL(Math.abs(t.valor))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FaturaCard({ grupo }: { grupo: FaturaGroup }) {
  const [open, setOpen] = useState(false)
  const badge = grupo.tipo === "fatura"
    ? <span className="pill pill-purple text-[10px]">Cartão</span>
    : grupo.tipo === "extrato"
    ? <span className="pill pill-teal text-[10px]">Conta</span>
    : <span className="pill pill-muted text-[10px]">Outro</span>

  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/[.02] transition-colors">
        <span className="shrink-0">{open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm capitalize">{grupo.mesAnoLabel}</span>
            {badge}
            {grupo.banco && grupo.banco !== "—" && <span className="pill pill-muted text-[10px]">{grupo.banco}</span>}
          </div>
          <p className="text-xs text-muted mt-0.5">{grupo.count} lançamentos · {grupo.dias.length} dias</p>
        </div>
        <div className="hidden sm:flex items-center gap-6 shrink-0 text-right">
          {grupo.receitas > 0 && grupo.tipo !== "fatura" && (
            <div><p className="text-[10px] text-muted uppercase">Receitas</p><p className="text-sm font-semibold text-teal">{formatBRL(grupo.receitas)}</p></div>
          )}
          <div><p className="text-[10px] text-muted uppercase">Gastos</p><p className="text-sm font-semibold text-red">{formatBRL(grupo.gastos)}</p></div>
          <div>
            <p className="text-[10px] text-muted uppercase">Saldo</p>
            <p className={`text-sm font-semibold ${grupo.saldo >= 0 ? "text-teal" : "text-red"}`}>{grupo.saldo >= 0 ? "+" : ""}{formatBRL(grupo.saldo)}</p>
          </div>
        </div>
        <div className="sm:hidden shrink-0 text-right">
          <p className="text-sm font-semibold text-red">{formatBRL(grupo.gastos)}</p>
          <p className="text-[10px] text-muted">gastos</p>
        </div>
      </button>
      {open && (
        <div className="border-t border-border">
          {grupo.dias.map(dia => <DiaSection key={dia.dataKey} dia={dia} tipo={grupo.tipo} />)}
          <div className="flex items-center justify-between px-5 py-3 bg-bg/60 border-t border-border text-xs">
            <span className="text-muted">{grupo.count} lançamentos · {grupo.dias.length} dias</span>
            <div className="flex items-center gap-4">
              {grupo.receitas > 0 && grupo.tipo !== "fatura" && <span className="text-teal font-semibold">+{formatBRL(grupo.receitas)}</span>}
              <span className="text-red font-semibold">-{formatBRL(grupo.gastos)}</span>
              <span className={`font-bold ${grupo.saldo >= 0 ? "text-teal" : "text-red"}`}>= {formatBRL(grupo.saldo)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

type Filtro = "todos" | "fatura" | "extrato" | "outro"

function TransacoesTab() {
  const { data, isLoading, error } = useFaturas()
  const [filtro, setFiltro] = useState<Filtro>("todos")
  const [busca, setBusca] = useState("")

  const tiposDisponiveis = useMemo((): Filtro[] => {
    if (!data) return ["todos"]
    return ["todos", ...(data.meta.tiposPresentes as Filtro[])]
  }, [data])

  const grupos = useMemo(() => {
    if (!data) return []
    let list = data.faturas
    if (filtro !== "todos") list = list.filter(g => g.tipo === filtro)
    if (busca.trim()) {
      const q = busca.toLowerCase()
      list = list.filter(g =>
        g.banco.toLowerCase().includes(q) || g.mesAnoLabel.toLowerCase().includes(q) ||
        g.dias.some(d => d.transacoes.some(t => t.descricao.toLowerCase().includes(q) || t.categoria.toLowerCase().includes(q)))
      )
    }
    return list
  }, [data, filtro, busca])

  const totais = useMemo(() => ({
    gastos: grupos.reduce((s, g) => s + g.gastos, 0),
    count: grupos.reduce((s, g) => s + g.count, 0),
  }), [grupos])

  const semTipo = data && data.meta.tiposPresentes.length === 1 && data.meta.tiposPresentes[0] === "outro"

  const filtroLabel: Record<Filtro, string> = { todos: "Todos", fatura: "Cartão", extrato: "Conta", outro: "Outro" }

  return (
    <main className="mx-auto max-w-[var(--container-page)] px-4 sm:px-6 lg:px-8 pt-5 pb-16">
      {isLoading && <Loader show />}
      {error && <div className="card p-6 text-center text-red text-sm">Erro: {String(error)}</div>}
      {!isLoading && data && (
        <>
          {semTipo && (
            <div className="mb-4 flex items-start gap-3 p-4 rounded-xl bg-yellow/10 border border-yellow/30 text-sm text-yellow">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>Tipo (cartão/conta) não detectado. O Apps Script não está gravando esse campo.</span>
            </div>
          )}

          {/* sumário */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="card p-4">
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Grupos</p>
              <p className="text-xl font-extrabold">{grupos.length}</p>
            </div>
            <div className="card p-4">
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Lançamentos</p>
              <p className="text-xl font-extrabold">{totais.count}</p>
            </div>
            <div className="card p-4">
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Total gastos</p>
              <p className="text-xl font-extrabold text-red">{formatBRL(totais.gastos)}</p>
            </div>
          </div>

          {/* filtros */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex gap-1.5">
              {tiposDisponiveis.map(f => (
                <button key={f} onClick={() => setFiltro(f)}
                  className={["px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border", filtro === f ? "bg-accent text-white border-accent" : "bg-card text-muted border-border hover:text-text"].join(" ")}>
                  {filtroLabel[f] ?? f}
                </button>
              ))}
            </div>
            <input value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar…"
              className="flex-1 min-w-[160px] max-w-sm bg-card border border-border rounded-xl px-4 py-1.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
            />
            <span className="text-xs text-muted ml-auto">{grupos.length} grupo{grupos.length !== 1 ? "s" : ""}</span>
          </div>

          {grupos.length === 0
            ? <div className="card p-12 text-center text-muted text-sm">Nenhum grupo encontrado.</div>
            : <div className="flex flex-col gap-3">{grupos.map(g => <FaturaCard key={g.id} grupo={g} />)}</div>
          }
        </>
      )}
    </main>
  )
}

// ── Parcelamentos Tab ─────────────────────────────────────────────────────────

function ParcelamentosTab({ data }: { data: DashboardData }) {
  const [aba, setAba] = useState<"ativo" | "finalizado">("ativo")
  const { parcelamentos } = data

  const ativos = parcelamentos.filter(p => p.status === "ativo")
  const finalizados = parcelamentos.filter(p => p.status === "finalizado")
  const lista = aba === "ativo" ? ativos : finalizados

  const totalEstimado = ativos.reduce((s, p) => s + p.pago + p.restante, 0)
  const totalPago = ativos.reduce((s, p) => s + p.pago, 0)
  const totalRestante = ativos.reduce((s, p) => s + p.restante, 0)
  const pct = totalEstimado > 0 ? Math.round((totalPago / totalEstimado) * 100) : 0

  const ultimaParcela = ativos.length > 0
    ? ativos.reduce((acc, p) => {
        const meses = p.totalParcelas - p.parcelaAtual
        return meses > acc.meses ? { meses, p } : acc
      }, { meses: 0, p: ativos[0] })
    : null

  return (
    <main className="mx-auto max-w-[var(--container-page)] px-4 sm:px-6 lg:px-8 pt-5 pb-16">
      {/* KPIs */}
      <div className="card p-5 mb-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Em andamento</p>
            <p className="text-2xl font-extrabold">{ativos.length}</p>
            <p className="text-[11px] text-muted">compras parceladas</p>
          </div>
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Valor total (est.)</p>
            <p className="text-xl font-extrabold">{formatBRL(totalEstimado)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Já pago</p>
            <p className="text-xl font-extrabold text-teal">{formatBRL(totalPago)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Restante</p>
            <p className="text-xl font-extrabold text-yellow">{formatBRL(totalRestante)}</p>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-[11px] text-muted mb-1">
            <span>Progresso geral</span>
            <span className="text-teal font-semibold">{pct}% pago</span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-teal rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {ultimaParcela && (
          <p className="text-[11px] text-muted mt-3">
            Última parcela estimada: <strong className="text-text">
              {(() => {
                const d = new Date(ultimaParcela.p.ultimaData + "T12:00:00")
                d.setMonth(d.getMonth() + (ultimaParcela.p.totalParcelas - ultimaParcela.p.parcelaAtual))
                return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
              })()}
            </strong>
          </p>
        )}
      </div>

      {/* tabs ativo/finalizado */}
      <div className="flex items-center gap-3 mb-4">
        {(["ativo", "finalizado"] as const).map(a => (
          <button key={a} onClick={() => setAba(a)}
            className={["px-4 py-2 rounded-xl text-sm font-semibold border transition-all", aba === a ? "bg-accent/15 border-accent/35 text-text" : "border-border text-muted hover:text-text"].join(" ")}>
            {a === "ativo" ? `Em andamento (${ativos.length})` : `Finalizadas (${finalizados.length})`}
          </button>
        ))}
      </div>

      {lista.length === 0
        ? <div className="card p-12 text-center text-muted text-sm">Nenhum parcelamento {aba === "ativo" ? "em andamento" : "finalizado"} detectado.</div>
        : (
          <div className="flex flex-col gap-3">
            {lista.map((p, i) => {
              const pctItem = (p.pago + p.restante) > 0 ? Math.round((p.pago / (p.pago + p.restante)) * 100) : 100
              return (
                <div key={i} className="card p-5">
                  <div className="flex items-center gap-4">
                    <Avatar name={p.descricao} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-semibold text-sm truncate">{p.descricao}</span>
                        <span className={`pill text-[10px] ${p.status === "ativo" ? "pill-teal" : "pill-muted"}`}>
                          {p.status === "ativo" ? "Ativo" : "Finalizado"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted">
                        {p.parcelaAtual}/{p.totalParcelas}x · {formatBRL(p.valorParcela)}/mês · {p.banco || "—"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">{formatBRL(p.restante)}</p>
                      <p className="text-[10px] text-muted">restante</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-teal rounded-full" style={{ width: `${pctItem}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      }
    </main>
  )
}

// ── Assinaturas Tab ───────────────────────────────────────────────────────────

function AssinaturasTab({ data }: { data: DashboardData }) {
  const { assinaturas } = data
  const totalMensal = assinaturas.reduce((s, a) => s + a.valorMensal, 0)

  return (
    <main className="mx-auto max-w-[var(--container-page)] px-4 sm:px-6 lg:px-8 pt-5 pb-16">
      {/* KPIs */}
      <div className="card p-5 mb-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Assinaturas</p>
            <p className="text-2xl font-extrabold">{assinaturas.length}</p>
            <p className="text-[11px] text-muted">ativas</p>
          </div>
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Gasto mensal</p>
            <p className="text-xl font-extrabold">{formatBRL(totalMensal)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Projeção anual</p>
            <p className="text-xl font-extrabold text-yellow">{formatBRL(totalMensal * 12)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Média/serviço</p>
            <p className="text-xl font-extrabold text-teal">{formatBRL(assinaturas.length > 0 ? totalMensal / assinaturas.length : 0)}</p>
          </div>
        </div>
      </div>

      {assinaturas.length === 0
        ? <div className="card p-12 text-center text-muted text-sm">Nenhuma assinatura recorrente detectada.<br />São necessários pelo menos 2 meses de histórico.</div>
        : (
          <div className="flex flex-col gap-3">
            {assinaturas.map((a, i) => (
              <div key={i} className="card p-4 flex items-center gap-4">
                <Avatar name={a.descricao} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{a.descricao}</p>
                  <p className="text-[11px] text-muted mt-0.5">
                    Próximo: {fmtProxData(a.proximaData)} · {a.pagamentos} pagamentos · {a.banco || "—"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold">{formatBRL(a.valorMensal)}</p>
                  <p className="text-[10px] text-muted">/mês</p>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </main>
  )
}

// ── Categorias Tab ────────────────────────────────────────────────────────────

function CategoriasTab({ data }: { data: DashboardData }) {
  const { categoriaComparacao, transacoesPorCategoria } = data

  return (
    <main className="mx-auto max-w-[var(--container-page)] px-4 sm:px-6 lg:px-8 pt-5 pb-16">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
        {/* Tabela completa */}
        <div className="card p-5">
          <p className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-4">Comparativo por Categoria</p>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[10px] text-muted font-semibold pb-2 pr-4">Categoria</th>
                <th className="text-right text-[10px] text-muted font-semibold pb-2 pr-4">Atual</th>
                <th className="text-[10px] text-muted font-semibold pb-2 pr-4 hidden sm:table-cell">Proporção</th>
                <th className="text-right text-[10px] text-muted font-semibold pb-2 pr-4">Variação</th>
                <th className="text-right text-[10px] text-muted font-semibold pb-2">Anterior</th>
              </tr>
            </thead>
            <tbody>
              {categoriaComparacao.map((c) => (
                <tr key={c.categoria} className="border-b border-border/40 last:border-0">
                  <td className="py-3 pr-4 font-medium">{c.categoria}</td>
                  <td className="py-3 pr-4 text-right font-semibold">{formatBRL(c.valor)}</td>
                  <td className="py-3 pr-4 hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-border rounded-full">
                        <div
                          className={`h-1.5 rounded-full ${c.variacao !== null && c.variacao > 0 ? "bg-red" : "bg-teal"}`}
                          style={{ width: `${Math.min(c.pct, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted w-8 text-right">{c.pct}%</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {c.variacao !== null ? (
                      <span className={`pill text-[10px] ${c.variacao > 0 ? "pill-red" : "pill-green"}`}>
                        {c.variacao > 0 ? "↑" : "↓"}{Math.abs(c.variacao)}%
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted">novo</span>
                    )}
                  </td>
                  <td className="py-3 text-right text-muted">{c.anterior > 0 ? formatBRL(c.anterior) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Donut */}
        <div className="card p-5">
          <p className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-4">Distribuição</p>
          <CategoriaDonut data={transacoesPorCategoria} />
        </div>
      </div>
    </main>
  )
}

// ── Root Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("visao-geral")
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useDashboard()
  useFaturas() // pre-fetch

  if (isLoading || !data) return <Loader show />

  return (
    <div className="min-h-screen bg-bg">
      <TabNav active={tab} onChange={setTab} onRefresh={refetch} isFetching={isFetching} />

      {tab === "visao-geral" && <VisaoGeral data={data} dataUpdatedAt={dataUpdatedAt} />}
      {tab === "transacoes" && <TransacoesTab />}
      {tab === "parcelamentos" && <ParcelamentosTab data={data} />}
      {tab === "assinaturas" && <AssinaturasTab data={data} />}
      {tab === "categorias" && <CategoriasTab data={data} />}
    </div>
  )
}
