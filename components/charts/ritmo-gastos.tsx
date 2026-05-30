"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts"

type Point = { dia: number; acumulado: number }

function buildChartData(atual: Point[], previo: Point[]) {
  const maxDia = Math.max(
    atual.length > 0 ? atual[atual.length - 1].dia : 0,
    previo.length > 0 ? previo[previo.length - 1].dia : 0,
  )
  return Array.from({ length: maxDia }, (_, i) => {
    const d = i + 1
    const a = atual.find((p) => p.dia === d)
    const p = previo.find((p) => p.dia === d)
    return {
      dia: d,
      atual: a?.acumulado ?? null,
      previo: p?.acumulado ?? null,
    }
  })
}

function fmtK(v: number) {
  if (v >= 1000) return `R$${(v / 1000).toFixed(0)}k`
  return `R$${v.toFixed(0)}`
}

export function RitmoGastosChart({
  dataAtual,
  dataPrevio,
}: {
  dataAtual: Point[]
  dataPrevio: Point[]
}) {
  const data = buildChartData(dataAtual, dataPrevio)
  const lastAtual = dataAtual[dataAtual.length - 1]

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="dia"
          tick={{ fontSize: 11, fill: "#6b7699" }}
          tickLine={false}
          axisLine={false}
          ticks={[1, 15, 25, data.length]}
        />
        <YAxis hide tickFormatter={fmtK} />
        <Tooltip
          contentStyle={{ background: "#1c2030", border: "1px solid #272d44", borderRadius: 10, fontSize: 12 }}
          labelStyle={{ color: "#6b7699" }}
          formatter={(v, name) => [
            `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            name === "atual" ? "Este mês" : "Mês passado",
          ]}
          labelFormatter={(l) => `Dia ${l}`}
        />
        <Line
          type="monotone"
          dataKey="previo"
          stroke="#6b7699"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="atual"
          stroke="#00c9a7"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
        {lastAtual && (
          <ReferenceDot
            x={lastAtual.dia}
            y={lastAtual.acumulado}
            r={4}
            fill="#00c9a7"
            stroke="#1c2030"
            strokeWidth={2}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}
