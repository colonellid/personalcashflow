"use client"

import { useQuery } from "@tanstack/react-query"

export type TransacaoFatura = {
  data: string
  descricao: string
  categoria: string
  banco: string
  origem: string
  extra1: string
  extra2: string
  valor: number
}

export type FaturaGroup = {
  id: string
  banco: string
  mesAnoKey: string
  mesAnoLabel: string
  count: number
  gastos: number
  receitas: number
  saldo: number
  transacoes: TransacaoFatura[]
}

export type FaturasData = {
  faturas: FaturaGroup[]
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
