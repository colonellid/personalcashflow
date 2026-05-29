import { NextRequest, NextResponse } from "next/server"

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

    const webhookUrl = process.env.APPS_SCRIPT_WEBHOOK_URL
    const webhookToken = process.env.APPS_SCRIPT_WEBHOOK_TOKEN

    if (!webhookUrl || !webhookToken) {
      return NextResponse.json(
        { error: "APPS_SCRIPT_WEBHOOK_URL ou APPS_SCRIPT_WEBHOOK_TOKEN não configurados" },
        { status: 500 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString("base64")

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: webhookToken,
        file: base64,
        filename: file.name,
        tipo,
      }),
      signal: AbortSignal.timeout(60_000),
    })

    const json = (await res.json()) as { status?: string; error?: string }

    if (json.error) throw new Error(json.error)

    return NextResponse.json({ ok: true, file: file.name, tipo, webhook: json })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
