"use client"

import { formatBRL } from "@/lib/format"

type DayData = { dia: number; diario: number }

function intensityClass(valor: number, max: number): string {
  if (valor === 0) return "bg-black/[.03] text-muted/50"
  const ratio = valor / max
  if (ratio < 0.2) return "bg-red/15 text-text"
  if (ratio < 0.5) return "bg-red/30 text-text"
  if (ratio < 0.8) return "bg-red/60 text-white"
  return "bg-red text-white"
}

export function HeatmapCalendar({
  data,
  hoje,
  mes,
  ano,
}: {
  data: DayData[]
  hoje: number
  mes: number
  ano: number
}) {
  // 0=Sun … 6=Sat, calendar starts Monday
  const firstWeekday = new Date(ano, mes, 1).getDay()
  const offset = firstWeekday === 0 ? 6 : firstWeekday - 1 // Mon=0

  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const max = Math.max(...data.map((d) => d.diario), 1)
  const maiorDia = data.reduce((acc, d) => (d.diario > acc.diario ? d : acc), { dia: 0, diario: 0 })

  const cells: Array<{ dia: number | null; diario: number }> = [
    ...Array(offset).fill({ dia: null, diario: 0 }),
    ...Array.from({ length: diasNoMes }, (_, i) => {
      const d = i + 1
      const found = data.find((x) => x.dia === d)
      return { dia: d, diario: found?.diario ?? 0 }
    }),
  ]

  const weekdays = ["S", "T", "Q", "Q", "S", "S", "D"]

  return (
    <div>
      {/* weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekdays.map((w, i) => (
          <div key={i} className="text-center text-[10px] text-muted font-semibold py-0.5">
            {w}
          </div>
        ))}
      </div>

      {/* day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) =>
          cell.dia === null ? (
            <div key={`empty-${i}`} />
          ) : (
            <div
              key={cell.dia}
              className={[
                "aspect-square rounded-md flex items-center justify-center text-[11px] font-medium transition-colors",
                intensityClass(cell.diario, max),
                cell.dia === hoje ? "ring-2 ring-accent ring-offset-1 ring-offset-card" : "",
                cell.dia > hoje ? "opacity-30" : "",
              ].join(" ")}
              title={cell.diario > 0 ? `${cell.dia}: ${formatBRL(cell.diario)}` : String(cell.dia)}
            >
              {cell.dia}
            </div>
          ),
        )}
      </div>

      {/* legend */}
      <div className="flex items-center justify-between mt-3 text-[11px] text-muted">
        <span>Menos</span>
        <div className="flex items-center gap-1">
          {["bg-black/[.03]", "bg-red/15", "bg-red/30", "bg-red/60", "bg-red"].map((cls, i) => (
            <div key={i} className={`w-4 h-4 rounded-sm ${cls}`} />
          ))}
        </div>
        <span>Mais</span>
      </div>

      {maiorDia.diario > 0 && (
        <div className="flex items-center justify-between mt-2 text-xs">
          <span className="text-muted">Maior gasto</span>
          <span className="text-red font-semibold">
            {formatBRL(maiorDia.diario)} — dia {maiorDia.dia}
          </span>
        </div>
      )}
    </div>
  )
}
