"use client"

import { useQuery } from "@tanstack/react-query"

export type DashboardData = {
  resumo: {
    mesAno: string
    receitasMes: number
    gastosMes: number
    saldoMes: number
    projetadoMes: number
    variacao: number
    maiorGastoDia: number
    maiorGastoValor: number
    totalAssinaturas: number
  }
  fluxoMensal: Array<{ mesLabel: string; receitas: number; gastos: number }>
  transacoesPorCategoria: Array<{ categoria: string; valor: number; pct: number }>
  categoriaComparacao: Array<{ categoria: string; valor: number; pct: number; anterior: number; variacao: number | null }>
  ultimasTransacoes: Array<{ data: string; descricao: string; categoria: string; banco?: string; valor: number }>
  proxProjecoes: Array<{ data: string; descricao: string; categoria: string; tipo: string; valor: number }>
  gastoDiario: Array<{ dia: number; diario: number; acumulado: number }>
  gastoDiarioPrevio: Array<{ dia: number; acumulado: number }>
  parcelamentos: Array<{
    descricao: string
    parcelaAtual: number
    totalParcelas: number
    valorParcela: number
    banco: string
    pago: number
    restante: number
    status: "ativo" | "finalizado"
    ultimaData: string
  }>
  assinaturas: Array<{
    descricao: string
    valorMensal: number
    banco: string
    proximaData: string
    pagamentos: number
  }>
  insight: { titulo: string; descricao: string }
  atualizadoEm: string
}

async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch("/api/dashboard", { cache: "no-store" })
  if (!res.ok) throw new Error("Falha ao carregar dashboard")
  const json = await res.json()
  return json.data as DashboardData
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
  })
}
