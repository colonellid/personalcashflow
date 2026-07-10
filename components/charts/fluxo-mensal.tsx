"use client"

import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts"
import { formatBRL } from "@/lib/format"

type Row = { mesLabel: string; receitas: number; gastos: number }

function cssVar(name: string, fallback: string) {
	if (typeof window === "undefined") return fallback
	const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
	return v || fallback
}

export function FluxoMensalChart({ data }: { data: Row[] }) {
	const muted = cssVar("--color-muted", "#737373")
	const border = cssVar("--color-border", "#e5e5e5")
	const teal = cssVar("--color-teal", "#16a34a")
	const red = cssVar("--color-red", "#dc2626")

	const tickStyle = { fill: muted, fontSize: 11 }
	const axisLineStyle = { stroke: border }
	const gridStyle = { stroke: border, strokeDasharray: "0" as const }

	return (
		<div className="h-[250px] w-full">
			<ResponsiveContainer width="100%" height="100%">
				<BarChart data={data} barCategoryGap="22%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
					<CartesianGrid {...gridStyle} vertical={false} />

					<XAxis
						dataKey="mesLabel"
						tick={tickStyle}
						axisLine={axisLineStyle}
						tickLine={false}
					/>

					<YAxis
						tick={tickStyle}
						axisLine={false}
						tickLine={false}
						tickFormatter={(v) => `R$${(Number(v) / 1000).toFixed(1)}k`}
					/>

					<Tooltip
						cursor={{ fill: "rgba(0,0,0,.04)" }}
						formatter={(value) => formatBRL(Number(value))}
					/>

					<Legend
						wrapperStyle={{
							color: muted,
							fontSize: 11,
						}}
					/>

					<Bar
						dataKey="receitas"
						name="Receitas"
						stroke={`rgba(0,0,0,0)`}
						radius={[10, 10, 0, 0]}
						fillOpacity={1}
						shape={undefined}
						fill={teal.startsWith("#") ? `${teal}A6` : "rgba(22,163,74,.65)"}
					/>

					<Bar
						dataKey="gastos"
						name="Gastos"
						radius={[10, 10, 0, 0]}
						fill={red.startsWith("#") ? `${red}A6` : "rgba(220,38,38,.65)"}
					/>
				</BarChart>
			</ResponsiveContainer>
		</div>
	)
}