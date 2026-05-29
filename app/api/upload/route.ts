import { NextRequest, NextResponse } from "next/server"
import { uploadFileToDrive } from "@/lib/google/drive-upload"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get("file") as File | null
    const tipo = form.get("tipo") as string | null

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json(
        { error: "Apenas arquivos .csv são suportados" },
        { status: 400 },
      )
    }

    const folderId =
      tipo === "extrato"
        ? process.env.DRIVE_EXTRATOS_ID
        : process.env.DRIVE_FOLDER_ID

    if (!folderId) {
      const varName = tipo === "extrato" ? "DRIVE_EXTRATOS_ID" : "DRIVE_FOLDER_ID"
      return NextResponse.json(
        { error: `Variável de ambiente ${varName} não configurada` },
        { status: 500 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const uploaded = await uploadFileToDrive(file.name, buffer, folderId)

    // Aciona o Apps Script para processar automaticamente (se configurado)
    let webhook: { triggered: boolean; status?: string; error?: string } = {
      triggered: false,
    }
    const webhookUrl = process.env.APPS_SCRIPT_WEBHOOK_URL
    const webhookToken = process.env.APPS_SCRIPT_WEBHOOK_TOKEN

    if (webhookUrl && webhookToken) {
      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ token: webhookToken }).toString(),
          signal: AbortSignal.timeout(30_000),
        })
        const json = (await res.json()) as { status?: string }
        webhook = { triggered: true, status: json.status ?? "ok" }
      } catch (e) {
        webhook = { triggered: false, error: String(e) }
      }
    }

    return NextResponse.json({
      ok: true,
      file: { id: uploaded.id, name: uploaded.name },
      tipo,
      webhook,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
