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
          tick={{ fontSize: 11, fill: "#737373" }}
          tickLine={false}
          axisLine={false}
          ticks={[1, 15, 25, data.length]}
        />
        <YAxis hide tickFormatter={fmtK} />
        <Tooltip
          contentStyle={{ background: "#ffffff", border: "1px solid #e5e5e5", borderRadius: 10, fontSize: 12, boxShadow: "0px 1px 2px 0px rgba(0,0,0,.05)" }}
          labelStyle={{ color: "#171717" }}
          formatter={(v, name) => [
            `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            name === "atual" ? "Este mês" : "Mês passado",
          ]}
          labelFormatter={(l) => `Dia ${l}`}
        />
        <Line
          type="monotone"
          dataKey="previo"
          stroke="#c8c8c8"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="atual"
          stroke="#16a34a"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
        {lastAtual && (
          <ReferenceDot
            x={lastAtual.dia}
            y={lastAtual.acumulado}
            r={4}
            fill="#16a34a"
            stroke="#ffffff"
            strokeWidth={2}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}
