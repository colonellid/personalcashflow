import { formatBRL, pillClass, PILL_STYLES } from "@/lib/format"

type Row = {
	data: string
	descricao: string
	categoria: string
	tipo: string
	valor: number
}

export function ProjecoesTable({ data }: { data: Row[] }) {
	return (
		<div className="max-h-[340px] overflow-y-auto">
			<table className="w-full border-collapse text-[13px]">
				<thead>
					<tr>
						{["Data", "Descrição", "Tipo"].map((h) => (
							<th
								key={h}
								className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted border-b border-border sticky top-0 bg-card"
							>
								{h}
							</th>
						))}
						<th className="text-right px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted border-b border-border sticky top-0 bg-card">
							Valor
						</th>
					</tr>
				</thead>

				<tbody>
					{data.length === 0 ? (
						<tr>
							<td colSpan={4} className="text-center text-muted py-10 text-[13px]">
								Nenhuma projeção pendente
							</td>
						</tr>
					) : (
						data.map((p, i) => {
							const variant = pillClass(p.tipo)
							return (
								<tr key={i} className="transition-colors hover:bg-black/[.04]">
									{/* Data */}
									<td className="px-3 py-3 border-b border-border text-muted whitespace-nowrap text-xs">
										{p.data}
									</td>

									{/* Descrição + categoria */}
									<td className="px-3 py-3 border-b border-border">
										<div className="font-semibold tracking-tight">
											{p.descricao}
										</div>
										<div className="mt-0.5 text-[11px] text-muted">
											{p.categoria}
										</div>
									</td>

									{/* Tipo (pill do seu format.ts) */}
									<td className="px-3 py-3 border-b border-border">
										<span
											className={`inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold ${
												PILL_STYLES[variant]
											}`}
										>
											{p.tipo || "—"}
										</span>
									</td>

									{/* Valor (pill vermelho, pois é pagamento/saída prevista) */}
									<td className="px-3 py-3 border-b border-border text-right">
										<div className="flex justify-end">
											<span className="pill pill-red">{formatBRL(p.valor)}</span>
										</div>
									</td>
								</tr>
							)
						})
					)}
				</tbody>
			</table>
		</div>
	)
}
