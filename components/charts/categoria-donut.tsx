"use client"

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { formatBRL } from "@/lib/format"

// Paleta de acentos documentada em docs/design-system/ (Dub) — 6 cores
// reais do guia. "Deep Sapphire" fica de fora por ser reservado a uma
// única ação primária por tela (nunca decorativo, per Do's/Don'ts).
const COLORS = [
	"#2563eb", // Electric Blue
	"#16a34a", // Vivid Green
	"#ea580c", // Tangerine
	"#7c3aed", // Lavender
	"#dc2626", // vermelho editorial (extrapolação p/ semântica financeira)
	"#a3a3a3", // Silver (neutro, para a fatia "Outros")
]

type Row = { categoria: string; valor: number }

export function CategoriaDonut({ data }: { data: Row[] }) {
	// Limita a paleta com significado a 5 categorias + agrupa o restante
	// em "Outros" — mais legível que 8 fatias e evita esticar a paleta
	// além das cores realmente documentadas no guia.
	const top = data.slice(0, 5)
	const outrosValor = data.slice(5).reduce((s, d) => s + d.valor, 0)
	const slices = outrosValor > 0 ? [...top, { categoria: "Outros", valor: outrosValor }] : top

	return (
		<div className="h-[250px] w-full">
			<ResponsiveContainer width="100%" height="100%">
				<PieChart>
					<Pie
						data={slices}
						dataKey="valor"
						nameKey="categoria"
						innerRadius="62%"
						outerRadius="90%"
						paddingAngle={2}
						stroke="var(--color-card)"
						strokeWidth={3}
					>
						{slices.map((_, i) => (
							<Cell key={i} fill={COLORS[i % COLORS.length]} />
						))}
					</Pie>

					<Tooltip formatter={(value) => formatBRL(Number(value))} />

					<Legend
						layout="vertical"
						align="right"
						verticalAlign="middle"
						wrapperStyle={{ color: "#737373", fontSize: 11, lineHeight: "14px" }}
					/>
				</PieChart>
			</ResponsiveContainer>
		</div>
	)
}
