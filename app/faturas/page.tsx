"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronDown, ChevronRight, RefreshCw, AlertCircle } from "lucide-react"
import { useFaturas, type FaturaGroup, type DiaGroup } from "@/hooks/use-faturas"
import { formatBRL } from "@/lib/format"
import { Loader } from "@/components/loader"

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDateBR(iso: string) {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

function formatDiaLabel(iso: string) {
  const date = new Date(iso + "T12:00:00")
  return date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })
}

function tipoBadge(tipo: FaturaGroup["tipo"]) {
  if (tipo === "fatura") return <span className="pill pill-purple text-[10px]">Cartão</span>
  if (tipo === "extrato") return <span className="pill pill-teal text-[10px]">Conta</span>
  return <span className="pill pill-muted text-[10px]">Outro</span>
}

// ── DiaSection ────────────────────────────────────────────────────────────────

function DiaSection({ dia, tipo }: { dia: DiaGroup; tipo: FaturaGroup["tipo"] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-border/40 last:border-0">
      {/* dia header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-white/[.025] transition-colors"
      >
        <span className="text-muted shrink-0">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className="text-xs font-semibold text-muted w-[120px] shrink-0">
          {formatDiaLabel(dia.dataKey)}
        </span>
        <span className="text-xs text-muted">
          {dia.transacoes.length} lançamento{dia.transacoes.length !== 1 ? "s" : ""}
        </span>
        <div className="ml-auto flex items-center gap-4 shrink-0">
          {dia.receitas > 0 && tipo !== "fatura" && (
            <span className="text-xs text-teal hidden sm:inline">+{formatBRL(dia.receitas)}</span>
          )}
          <span className={`text-xs font-semibold ${dia.gastos > 0 ? "text-red" : "text-muted"}`}>
            -{formatBRL(dia.gastos)}
          </span>
        </div>
      </button>

      {/* transações do dia */}
      {open && (
        <div className="pb-1">
          {dia.transacoes.map((t, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-5 py-2 hover:bg-white/[.02] transition-colors"
            >
              <span className="w-[16px] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{t.descricao || "—"}</div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[11px] text-muted">{t.categoria}</span>
                  {t.meta && (
                    <span className="text-[10px] text-muted/60 hidden md:inline">{t.meta}</span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <span
                  className={[
                    "inline-flex min-w-[96px] justify-center pill text-[12px]",
                    t.valor >= 0 ? "pill-green" : "pill-red",
                  ].join(" ")}
                >
                  {t.valor >= 0 ? "+" : "−"} {formatBRL(Math.abs(t.valor))}
                </span>
                {t.tipo === "fatura" && t.valorOriginal !== t.valor && (
                  <div className="text-[10px] text-muted/50 mt-0.5">
                    orig: {formatBRL(Math.abs(t.valorOriginal))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── FaturaCard ────────────────────────────────────────────────────────────────

function FaturaCard({ grupo }: { grupo: FaturaGroup }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="card overflow-hidden">
      {/* mês header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/[.02] transition-colors"
      >
        <span className="text-text shrink-0">
          {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm capitalize">{grupo.mesAnoLabel}</span>
            {tipoBadge(grupo.tipo)}
            {grupo.banco && grupo.banco !== "—" && (
              <span className="pill pill-muted text-[10px]">{grupo.banco}</span>
            )}
          </div>
          <p className="text-xs text-muted mt-0.5">
            {grupo.count} lançamento{grupo.count !== 1 ? "s" : ""} · {grupo.dias.length} dia{grupo.dias.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* totais (desktop) */}
        <div className="hidden sm:flex items-center gap-6 shrink-0 text-right">
          {grupo.receitas > 0 && grupo.tipo !== "fatura" && (
            <div>
              <p className="text-[10px] text-muted uppercase tracking-wide">Receitas</p>
              <p className="text-sm font-semibold text-teal">{formatBRL(grupo.receitas)}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wide">Gastos</p>
            <p className="text-sm font-semibold text-red">{formatBRL(grupo.gastos)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wide">Saldo</p>
            <p className={`text-sm font-semibold ${grupo.saldo >= 0 ? "text-teal" : "text-red"}`}>
              {grupo.saldo >= 0 ? "+" : ""}{formatBRL(grupo.saldo)}
            </p>
          </div>
        </div>

        {/* total (mobile) */}
        <div className="sm:hidden shrink-0 text-right">
          <p className="text-sm font-semibold text-red">{formatBRL(grupo.gastos)}</p>
          <p className="text-[10px] text-muted">gastos</p>
        </div>
      </button>

      {/* dias expandidos */}
      {open && (
        <div className="border-t border-border">
          {grupo.dias.map((dia) => (
            <DiaSection key={dia.dataKey} dia={dia} tipo={grupo.tipo} />
          ))}

          {/* rodapé com totais */}
          <div className="flex items-center justify-between px-5 py-3 bg-bg/60 border-t border-border text-xs">
            <span className="text-muted">{grupo.count} lançamentos · {grupo.dias.length} dias</span>
            <div className="flex items-center gap-4">
              {grupo.receitas > 0 && grupo.tipo !== "fatura" && (
                <span className="text-teal font-semibold">+{formatBRL(grupo.receitas)}</span>
              )}
              <span className="text-red font-semibold">-{formatBRL(grupo.gastos)}</span>
              <span className={`font-bold ${grupo.saldo >= 0 ? "text-teal" : "text-red"}`}>
                = {formatBRL(grupo.saldo)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Filtro = "todos" | "fatura" | "extrato" | "outro"

export default function FaturasPage() {
  const { data, isLoading, isFetching, refetch, error } = useFaturas()
  const [filtro, setFiltro] = useState<Filtro>("todos")
  const [busca, setBusca] = useState("")

  const tiposDisponiveis = useMemo((): Filtro[] => {
    if (!data) return ["todos"]
    const tipos = data.meta.tiposPresentes as Filtro[]
    return ["todos", ...tipos]
  }, [data])

  const grupos = useMemo(() => {
    if (!data) return []
    let list = data.faturas
    if (filtro !== "todos") {
      list = list.filter((g) => g.tipo === filtro)
    }
    if (busca.trim()) {
      const q = busca.toLowerCase()
      list = list.filter(
        (g) =>
          g.banco.toLowerCase().includes(q) ||
          g.mesAnoLabel.toLowerCase().includes(q) ||
          g.tipo.includes(q) ||
          g.dias.some((d) =>
            d.transacoes.some(
              (t) =>
                t.descricao.toLowerCase().includes(q) ||
                t.categoria.toLowerCase().includes(q),
            ),
          ),
      )
    }
    return list
  }, [data, filtro, busca])

  const totais = useMemo(() => ({
    gastos: grupos.reduce((s, g) => s + g.gastos, 0),
    receitas: grupos.filter(g => g.tipo !== "fatura").reduce((s, g) => s + g.receitas, 0),
    count: grupos.reduce((s, g) => s + g.count, 0),
    grupos: grupos.length,
  }), [grupos])

  const semTipoDetectado = data && data.meta.tiposPresentes.length === 1 && data.meta.tiposPresentes[0] === "outro"

  const filtroLabel: Record<Filtro, string> = {
    todos: "Todos",
    fatura: "Fatura (Cartão)",
    extrato: "Extrato (Conta)",
    outro: "Outro",
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* nav */}
      <nav className="sticky top-0 z-[100] border-b border-border bg-surface">
        <div className="mx-auto max-w-[var(--container-page)] px-5 sm:px-6 lg:px-8 h-[64px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[rgba(123,111,240,0.16)] border border-[rgba(123,111,240,0.20)] flex items-center justify-center">
              <span className="text-[18px]">🧾</span>
            </div>
            <div className="leading-tight">
              <div className="text-[14px] font-extrabold tracking-tight">Personal Cashflow</div>
              <div className="text-[12px] text-muted">Relatório de Faturas</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors disabled:opacity-40"
            >
              <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
            <Link href="/" className="flex items-center gap-2 text-sm text-muted hover:text-text transition-colors">
              <ArrowLeft size={16} />
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-[var(--container-page)] px-5 sm:px-6 lg:px-8 pt-8 pb-[60px]">
        <header className="mb-6">
          <h1 className="text-[28px] sm:text-[32px] font-extrabold tracking-tight leading-[1.05]">
            Faturas e Extratos
          </h1>
          <p className="text-[13px] text-muted mt-1">
            Transações agrupadas por origem · mês · dia
          </p>
        </header>

        {isLoading && <Loader show />}

        {error && (
          <div className="card p-6 text-center text-red text-sm">
            Erro ao carregar: {String(error)}
          </div>
        )}

        {!isLoading && data && (
          <>
            {/* aviso: tipo não detectado — Apps Script não grava o campo */}
            {semTipoDetectado && (
              <div className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-yellow/10 border border-yellow/30 text-sm text-yellow">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>
                  Não foi possível detectar se as transações são de <strong>fatura</strong> ou <strong>extrato</strong> — o Apps Script não está gravando esse campo na planilha.
                  Todos os grupos aparecem como "Outro" e os filtros Fatura/Extrato não funcionarão até que o campo seja adicionado.
                </span>
              </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="card p-4">
                <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Grupos</p>
                <p className="text-xl font-extrabold">{totais.grupos}</p>
              </div>
              <div className="card p-4">
                <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Lançamentos</p>
                <p className="text-xl font-extrabold">{totais.count}</p>
              </div>
              <div className="card p-4">
                <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Total gastos</p>
                <p className="text-xl font-extrabold text-red">{formatBRL(totais.gastos)}</p>
              </div>
              <div className="card p-4">
                <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Total receitas</p>
                <p className="text-xl font-extrabold text-teal">{formatBRL(totais.receitas)}</p>
              </div>
            </div>

            {/* filtros + busca */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <div className="flex gap-1.5 flex-wrap">
                {tiposDisponiveis.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFiltro(f)}
                    className={[
                      "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border",
                      filtro === f
                        ? "bg-accent text-white border-accent"
                        : "bg-card text-muted border-border hover:text-text",
                    ].join(" ")}
                  >
                    {filtroLabel[f] ?? f}
                  </button>
                ))}
              </div>

              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por mês, descrição ou categoria…"
                className="flex-1 min-w-[200px] max-w-sm bg-card border border-border rounded-xl px-4 py-1.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
              />

              <span className="text-xs text-muted ml-auto">
                {grupos.length} grupo{grupos.length !== 1 ? "s" : ""}
              </span>
            </div>

            {grupos.length === 0 ? (
              <div className="card p-12 text-center text-muted text-sm">
                Nenhum grupo encontrado.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {grupos.map((g) => (
                  <FaturaCard key={g.id} grupo={g} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
