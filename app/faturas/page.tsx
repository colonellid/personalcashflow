"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronDown, ChevronRight, RefreshCw } from "lucide-react"
import { useFaturas, type FaturaGroup } from "@/hooks/use-faturas"
import { formatBRL } from "@/lib/format"
import { Loader } from "@/components/loader"

// ── helpers ──────────────────────────────────────────────────────────────────

function bancoTipo(banco: string): "fatura" | "extrato" | "outro" {
  const b = banco.toLowerCase()
  if (b.includes("fatura") || b.includes("cartão") || b.includes("credito") || b.includes("crédito")) return "fatura"
  if (b.includes("extrato") || b.includes("conta") || b.includes("corrente")) return "extrato"
  return "outro"
}

function pillTipo(tipo: "fatura" | "extrato" | "outro") {
  if (tipo === "fatura") return "pill pill-purple"
  if (tipo === "extrato") return "pill pill-teal"
  return "pill pill-muted"
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

// ── FaturaCard ────────────────────────────────────────────────────────────────

function FaturaCard({ grupo }: { grupo: FaturaGroup }) {
  const [open, setOpen] = useState(false)
  const tipo = bancoTipo(grupo.banco)

  return (
    <div className="card overflow-hidden">
      {/* header clicável */}
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
            <span className={pillTipo(tipo)}>{grupo.banco || "—"}</span>
          </div>
          <p className="text-xs text-muted mt-0.5">{grupo.count} transação{grupo.count !== 1 ? "ões" : ""}</p>
        </div>

        <div className="hidden sm:flex items-center gap-6 shrink-0 text-right">
          {grupo.receitas > 0 && (
            <div>
              <p className="text-[11px] text-muted uppercase tracking-wide">Receitas</p>
              <p className="text-sm font-semibold text-teal">{formatBRL(grupo.receitas)}</p>
            </div>
          )}
          <div>
            <p className="text-[11px] text-muted uppercase tracking-wide">Gastos</p>
            <p className="text-sm font-semibold text-red">{formatBRL(grupo.gastos)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted uppercase tracking-wide">Saldo</p>
            <p className={`text-sm font-semibold ${grupo.saldo >= 0 ? "text-teal" : "text-red"}`}>
              {formatBRL(grupo.saldo)}
            </p>
          </div>
        </div>

        {/* mobile totals */}
        <div className="sm:hidden shrink-0 text-right">
          <p className={`text-sm font-semibold ${grupo.saldo >= 0 ? "text-teal" : "text-red"}`}>
            {formatBRL(grupo.saldo)}
          </p>
          <p className="text-xs text-muted">saldo</p>
        </div>
      </button>

      {/* transações expandidas */}
      {open && (
        <div className="border-t border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-bg/40">
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted w-[90px]">Data</th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted">Descrição</th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted hidden md:table-cell">Categoria</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted w-[130px]">Valor</th>
                </tr>
              </thead>
              <tbody>
                {grupo.transacoes.map((t, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/50 last:border-0 hover:bg-white/[.025] transition-colors"
                  >
                    <td className="px-5 py-3 text-xs text-muted whitespace-nowrap">
                      {formatDate(t.data)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium leading-snug">{t.descricao || "—"}</div>
                      {(t.origem || t.extra1 || t.extra2) && (
                        <div className="text-[11px] text-muted mt-0.5 space-x-2">
                          {t.origem && <span>{t.origem}</span>}
                          {t.extra1 && <span>{t.extra1}</span>}
                          {t.extra2 && <span>{t.extra2}</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted hidden md:table-cell">
                      {t.categoria}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={[
                          "inline-flex min-w-[96px] justify-center pill",
                          t.valor >= 0 ? "pill-green" : "pill-red",
                        ].join(" ")}
                      >
                        {t.valor >= 0 ? "+" : "−"} {formatBRL(Math.abs(t.valor))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* subtotais */}
              <tfoot>
                <tr className="bg-bg/60 border-t border-border">
                  <td colSpan={2} className="px-5 py-3 text-xs text-muted font-semibold">
                    {grupo.count} lançamentos
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell" />
                  <td className="px-5 py-3 text-right">
                    <span className={`text-sm font-bold ${grupo.saldo >= 0 ? "text-teal" : "text-red"}`}>
                      {formatBRL(grupo.saldo)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
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

  const grupos = useMemo(() => {
    if (!data) return []
    let list = data.faturas
    if (filtro !== "todos") {
      list = list.filter((g) => bancoTipo(g.banco) === filtro)
    }
    if (busca.trim()) {
      const q = busca.toLowerCase()
      list = list.filter(
        (g) =>
          g.banco.toLowerCase().includes(q) ||
          g.mesAnoLabel.toLowerCase().includes(q) ||
          g.transacoes.some(
            (t) =>
              t.descricao.toLowerCase().includes(q) ||
              t.categoria.toLowerCase().includes(q),
          ),
      )
    }
    return list
  }, [data, filtro, busca])

  const totais = useMemo(() => {
    const list = grupos
    return {
      gastos: list.reduce((s, g) => s + g.gastos, 0),
      receitas: list.reduce((s, g) => s + g.receitas, 0),
      count: list.reduce((s, g) => s + g.count, 0),
    }
  }, [grupos])

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
            Transações agrupadas por origem e mês de competência
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
            {/* totais rápidos */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="card p-4">
                <p className="text-[11px] text-muted uppercase tracking-wider mb-1">Lançamentos</p>
                <p className="text-xl font-extrabold">{totais.count}</p>
              </div>
              <div className="card p-4">
                <p className="text-[11px] text-muted uppercase tracking-wider mb-1">Total gastos</p>
                <p className="text-xl font-extrabold text-red">{formatBRL(totais.gastos)}</p>
              </div>
              <div className="card p-4">
                <p className="text-[11px] text-muted uppercase tracking-wider mb-1">Total receitas</p>
                <p className="text-xl font-extrabold text-teal">{formatBRL(totais.receitas)}</p>
              </div>
            </div>

            {/* filtros + busca */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <div className="flex gap-1.5">
                {(["todos", "fatura", "extrato", "outro"] as Filtro[]).map((f) => (
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
                    {f === "todos" ? "Todos" : f === "fatura" ? "Fatura" : f === "extrato" ? "Extrato" : "Outro"}
                  </button>
                ))}
              </div>

              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por banco, mês ou descrição…"
                className="flex-1 min-w-[200px] max-w-sm bg-card border border-border rounded-xl px-4 py-1.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
              />

              <span className="text-xs text-muted ml-auto">
                {grupos.length} grupo{grupos.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* lista de faturas */}
            {grupos.length === 0 ? (
              <div className="card p-12 text-center text-muted text-sm">
                Nenhum grupo encontrado para o filtro selecionado.
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
