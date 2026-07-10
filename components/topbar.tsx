"use client"

import { Button } from "@/components/ui/button"

type Props = {
    lastUpdate: string
    onRefresh: () => void
    isLoading: boolean
}

export function Topbar({ lastUpdate, onRefresh, isLoading }: Props) {
    return (
        <nav className="sticky top-0 z-[100] border-b border-border bg-surface">
            <div className="mx-auto max-w-[var(--container-page)] px-5 sm:px-6 lg:px-8 h-[64px] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[14px] bg-accent-soft border border-accent/20 flex items-center justify-center">
                        <span className="text-[18px]">💰</span>
                    </div>

                    <div className="leading-tight">
                        <div className="text-[14px] font-extrabold tracking-tight">
                            Personal Cashflow
                        </div>
                        <div className="text-[12px] text-muted">Dashboard Financeiro</div>
                    </div>

                    <div className="hidden md:flex pill pill-purple items-center gap-1.5">
                        <span className="w-[7px] h-[7px] rounded-full bg-accent" />
                        Live
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-2 text-xs text-muted">
                        <span className="w-[7px] h-[7px] rounded-full bg-teal" />
                        <span>{lastUpdate}</span>
                    </div>

                    <Button
                        type="button"
                        onClick={onRefresh}
                        disabled={isLoading}
                        className="h-10 px-4 rounded-[12px] bg-accent text-white text-[13px] font-semibold tracking-tight transition-colors hover:bg-accent/90"
                    >
                        {isLoading ? "⏳ Atualizando..." : "Atualizar"}
                    </Button>
                </div>
            </div>
        </nav>
    )
}