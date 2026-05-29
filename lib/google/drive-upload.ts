import { google } from "googleapis"
import { Readable } from "stream"

function getDriveClient() {
  const raw = process.env.GOOGLE_SA_KEY_BASE64
  if (!raw) throw new Error("GOOGLE_SA_KEY_BASE64 não configurada")
  const credentials = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"))
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/drive"],
  })
  return google.drive({ version: "v3", auth })
}

export async function uploadFileToDrive(
  fileName: string,
  content: Buffer,
  folderId: string,
): Promise<{ id: string; name: string }> {
  const drive = getDriveClient()
  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: "text/csv",
      body: Readable.from(content),
    },
    fields: "id,name",
  })
  if (!res.data.id || !res.data.name) {
    throw new Error("Upload para o Drive falhou: resposta sem id/name")
  }
  return { id: res.data.id, name: res.data.name }
}
