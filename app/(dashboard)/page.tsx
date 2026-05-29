"use client"

import Link from "next/link"
import { useDashboard } from "@/hooks/use-dashboard"
import { Loader } from "@/components/loader"
import { Topbar } from "@/components/topbar"
import { KpiCard } from "@/components/kpi-card"
import { SectionLabel } from "@/components/section-label"
import { FluxoMensalChart } from "@/components/charts/fluxo-mensal"
import { CategoriaDonut } from "@/components/charts/categoria-donut"
import { RankingCategorias } from "@/components/ranking-categorias"
import { TransacoesTable } from "@/components/tables/transacoes-table"
import { ProjecoesTable } from "@/components/tables/projecoes-table"

export default function DashboardPage() {
	const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useDashboard()

	const lastUpdate = dataUpdatedAt
		? `Atualizado às ${new Date(dataUpdatedAt).toLocaleTimeString("pt-BR")}`
		: "—"

	if (isLoading || !data) {
		return <Loader show />
	}

	const {
		resumo,
		fluxoMensal,
		transacoesPorCategoria,
		ultimasTransacoes,
		proxProjecoes,
	} = data

	return (
		<>
			<Topbar
				lastUpdate={lastUpdate}
				onRefresh={() => refetch()}
				isLoading={isFetching}
			/>

			<main className="container-page px-5 sm:px-6 lg:px-8 pt-6 pb-[60px]">
				<header className="flex items-end justify-between gap-4 mb-6">
					<div>
						<h1 className="text-[28px] sm:text-[32px] font-extrabold tracking-tight capitalize leading-[1.05]">
							{resumo.mesAno}
						</h1>
						<p className="text-[13px] text-muted mt-1">
							Visão consolidada · Real + Projetado
						</p>
					</div>

					<div className="flex items-center gap-2">
						<Link href="/upload" className="pill pill-teal hidden sm:inline-flex">
							Upload CSV
						</Link>
						<Link href="/faturas" className="pill pill-yellow hidden sm:inline-flex">
							Faturas
						</Link>
						<span className="pill pill-purple hidden md:inline-flex">Dashboard</span>
						<span className="pill pill-muted hidden md:inline-flex">v1</span>
					</div>
				</header>

				{/* KPIs */}
				<section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
					<KpiCard
						variant="receita"
						label="Receitas"
						value={resumo.receitasMes}
						hint="Entradas confirmadas"
						icon="💚"
					/>
					<KpiCard
						variant="gasto"
						label="Gastos Reais"
						value={resumo.gastosMes}
						hint="Transações efetivadas"
						icon="💸"
					/>
					<KpiCard
						variant="saldo"
						label="Saldo do Mês"
						value={resumo.saldoMes}
						hint={resumo.saldoMes >= 0 ? "✅ Positivo" : "⚠️ Negativo"}
						icon="📊"
					/>
					<KpiCard
						variant="futuro"
						label="A Vencer"
						value={resumo.projetadoMes}
						hint="Projeções pendentes"
						icon="📅"
					/>
				</section>

				{/* Charts */}
				<SectionLabel>📈 Análise de Fluxo</SectionLabel>
				<section className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 mb-6">
					<div className="card card-hover p-5 sm:p-6">
						<div className="flex items-start justify-between gap-3 mb-4">
							<h3 className="text-sm font-semibold flex items-center gap-2">
								📆 Receitas vs Gastos — últimos 6 meses
							</h3>
							<span className="hidden sm:inline-flex pill pill-muted">Bar</span>
						</div>
						<FluxoMensalChart data={fluxoMensal} />
					</div>

					<div className="card card-hover p-5 sm:p-6">
						<div className="flex items-start justify-between gap-3 mb-4">
							<h3 className="text-sm font-semibold flex items-center gap-2">
								🍕 Distribuição por Categoria
							</h3>
							<span className="hidden sm:inline-flex pill pill-muted">Donut</span>
						</div>
						<CategoriaDonut data={transacoesPorCategoria} />
					</div>
				</section>

				{/* Ranking */}
				<SectionLabel>🏷️ Categorias</SectionLabel>
				<section className="card card-hover p-5 sm:p-6 mb-6">
					<h3 className="text-sm font-semibold mb-4">
						Ranking de gastos do mês atual
					</h3>
					<RankingCategorias data={transacoesPorCategoria} />
				</section>

				{/* Tabelas */}
				<SectionLabel>📋 Movimentações</SectionLabel>
				<section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					<div className="card card-hover p-5 sm:p-6">
						<h3 className="text-sm font-semibold mb-4">
							🕐 Últimas Transações
						</h3>
						<TransacoesTable data={ultimasTransacoes} />
					</div>

					<div className="card card-hover p-5 sm:p-6">
						<h3 className="text-sm font-semibold mb-4">
							📅 Próximas Projeções
						</h3>
						<ProjecoesTable data={proxProjecoes} />
					</div>
				</section>
			</main>
		</>
	)
}
