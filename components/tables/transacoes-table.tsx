import { formatBRL } from "@/lib/format"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

type Row = {
    data: string
    descricao: string
    categoria: string
    banco?: string
    valor: number
}

function ValuePill({ value }: { value: number }) {
    const isEntrada = value >= 0
    const cls = isEntrada ? "pill pill-green" : "pill pill-red"
    const label = formatBRL(Math.abs(value))

    return (
        <span className={`${cls} inline-flex min-w-[92px] justify-center`}>
            {label}
        </span>
    )
}

export function TransacoesTable({ data }: { data: Row[] }) {
    return (
        <div className="max-h-[340px] overflow-y-auto">
            <Table className="text-[13px]">
                <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                    <TableRow>
                        <TableHead className="w-[100px] text-[11px] font-semibold uppercase tracking-wider text-muted">
                            Data
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                            Descrição
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                            Categoria
                        </TableHead>
                        <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted">
                            Valor
                        </TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center text-muted text-[13px]">
                                Sem transações
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((t, i) => (
                            <TableRow key={i} className="transition-colors hover:bg-black/[.04] border-b-border">
                                <TableCell className="text-muted whitespace-nowrap text-xs">
                                    {t.data}
                                </TableCell>

                                <TableCell>
                                    <div className="font-semibold tracking-tight">{t.descricao}</div>
                                    {t.banco && (
                                        <div className="mt-0.5 text-[11px] text-muted">{t.banco}</div>
                                    )}
                                </TableCell>

                                <TableCell className="text-xs text-muted">
                                    {t.categoria ?? ""}
                                </TableCell>

                                <TableCell className="text-right">
                                    <div className="flex justify-end">
                                        <ValuePill value={t.valor} />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}