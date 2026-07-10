"use client"

import { useCallback, useRef, useState } from "react"
import Link from "next/link"
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowLeft,
} from "lucide-react"

type Tipo = "fatura" | "extrato"
type Estado = "idle" | "uploading" | "ok" | "erro"

export default function UploadPage() {
  const [tipo, setTipo] = useState<Tipo>("fatura")
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [estado, setEstado] = useState<Estado>("idle")
  const [mensagem, setMensagem] = useState("")
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const aceitarArquivo = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setMensagem("Apenas arquivos .csv são suportados.")
      setEstado("erro")
      return
    }
    setArquivo(file)
    setEstado("idle")
    setMensagem("")
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) aceitarArquivo(file)
    },
    [aceitarArquivo],
  )

  const enviar = async () => {
    if (!arquivo) return
    setEstado("uploading")
    setMensagem("")
    try {
      const form = new FormData()
      form.append("file", arquivo)
      form.append("tipo", tipo)
      const res = await fetch("/api/upload", { method: "POST", body: form })
      const json = (await res.json()) as {
        ok?: boolean
        error?: string
        file?: { name: string }
        webhook?: { triggered: boolean }
      }
      if (!res.ok || json.error) throw new Error(json.error ?? "Erro desconhecido")
      const auto = json.webhook?.triggered
        ? "Processamento iniciado automaticamente."
        : "Abra a planilha e rode «Processar Tudo» para importar."
      setMensagem(`${json.file?.name} enviado com sucesso. ${auto}`)
      setEstado("ok")
      setArquivo(null)
      if (inputRef.current) inputRef.current.value = ""
    } catch (e) {
      setMensagem(String(e))
      setEstado("erro")
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header simples */}
      <nav className="sticky top-0 z-[100] border-b border-border bg-surface">
        <div className="mx-auto max-w-[var(--container-page)] px-5 sm:px-6 lg:px-8 h-[64px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-accent-soft border border-accent/20 flex items-center justify-center">
              <span className="text-[18px]">💰</span>
            </div>
            <div className="leading-tight">
              <div className="text-[14px] font-extrabold tracking-tight">Personal Cashflow</div>
              <div className="text-[12px] text-muted">Upload de CSV</div>
            </div>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted hover:text-text transition-colors"
          >
            <ArrowLeft size={16} />
            Dashboard
          </Link>
        </div>
      </nav>

      <main className="container-page px-5 sm:px-6 lg:px-8 pt-10 pb-[60px]">
        <header className="mb-8">
          <h1 className="font-display text-[28px] sm:text-[32px] leading-[1.11]">
            Upload de CSV
          </h1>
          <p className="text-[13px] text-muted mt-1">
            Envie faturas do cartão ou extratos da conta corrente para o Google Drive
          </p>
        </header>

        <div className="max-w-xl">
          {/* Toggle fatura / extrato */}
          <div className="flex gap-2 mb-6">
            {(["fatura", "extrato"] as Tipo[]).map((t) => (
              <button
                key={t}
                onClick={() => setTipo(t)}
                className={[
                  "px-4 py-2 rounded-xl text-sm font-semibold transition-all border",
                  tipo === t
                    ? "bg-accent text-white border-accent shadow-md"
                    : "bg-card text-muted border-border hover:text-text",
                ].join(" ")}
              >
                {t === "fatura" ? "📄 Fatura (Cartão)" : "🏦 Extrato (Conta)"}
              </button>
            ))}
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={[
              "card cursor-pointer border-2 border-dashed transition-all p-10",
              "flex flex-col items-center justify-center gap-4 select-none",
              dragging
                ? "border-accent bg-accent/10"
                : "border-border hover:border-accent/40",
            ].join(" ")}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) aceitarArquivo(f)
              }}
            />

            {arquivo ? (
              <>
                <FileSpreadsheet size={36} className="text-teal" />
                <p className="text-sm font-semibold text-text">{arquivo.name}</p>
                <p className="text-xs text-muted">
                  {(arquivo.size / 1024).toFixed(1)} KB
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setArquivo(null)
                    setEstado("idle")
                    setMensagem("")
                  }}
                  className="pill pill-muted flex items-center gap-1 text-xs"
                >
                  <X size={12} /> remover
                </button>
              </>
            ) : (
              <>
                <Upload size={36} className="text-muted" />
                <p className="text-sm font-semibold text-text">
                  Arraste o arquivo CSV aqui
                </p>
                <p className="text-xs text-muted">ou clique para selecionar</p>
              </>
            )}
          </div>

          {/* Feedback */}
          {estado === "ok" && (
            <div className="mt-4 flex items-start gap-3 p-4 rounded-xl bg-teal/10 border border-teal/30 text-sm text-teal">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <span>{mensagem}</span>
            </div>
          )}
          {estado === "erro" && (
            <div className="mt-4 flex items-start gap-3 p-4 rounded-xl bg-red/10 border border-red/30 text-sm text-red">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{mensagem}</span>
            </div>
          )}

          {/* Botão */}
          <button
            onClick={enviar}
            disabled={!arquivo || estado === "uploading"}
            className={[
              "mt-6 w-full py-3 rounded-xl font-semibold text-sm transition-all",
              !arquivo || estado === "uploading"
                ? "bg-border text-muted cursor-not-allowed"
                : "bg-accent hover:bg-accent/90 text-white shadow-lg cursor-pointer",
            ].join(" ")}
          >
            {estado === "uploading" ? "Enviando…" : "Enviar para o Drive"}
          </button>

          <p className="mt-4 text-xs text-muted leading-relaxed">
            {tipo === "fatura"
              ? "Arquivo vai para a pasta FATURAS no Drive. Exporte o CSV do C6 Bank: Fatura → Exportar."
              : "Arquivo vai para a pasta EXTRATOS no Drive. Exporte o extrato CSV do C6 Bank: Conta → Extrato."}
          </p>
        </div>
      </main>
    </div>
  )
}
