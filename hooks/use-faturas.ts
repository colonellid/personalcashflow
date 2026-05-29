"use client"

import { useQuery } from "@tanstack/react-query"

export type TransacaoFatura = {
  data: string
  descricao: string
  categoria: string
  banco: string
  tipo: "fatura" | "extrato" | "outro"
  valor: number
  valorOriginal: number
  meta: string | null
}

export type DiaGroup = {
  dataKey: string
  gastos: number
  receitas: number
  saldo: number
  transacoes: TransacaoFatura[]
}

export type FaturaGroup = {
  id: string
  banco: string
  tipo: "fatura" | "extrato" | "outro"
  mesAnoKey: string
  mesAnoLabel: string
  count: number
  gastos: number
  receitas: number
  saldo: number
  dias: DiaGroup[]
}

export type FaturasData = {
  faturas: FaturaGroup[]
  meta: {
    tiposPresentes: string[]
    bancosPresentes: string[]
  }
}

async function fetchFaturas(): Promise<FaturasData> {
  const res = await fetch("/api/faturas", { cache: "no-store" })
  if (!res.ok) throw new Error("Falha ao carregar faturas")
  const json = await res.json()
  return json.data as FaturasData
}

export function useFaturas() {
  return useQuery({
    queryKey: ["faturas"],
    queryFn: fetchFaturas,
    staleTime: 60_000,
  })
}
