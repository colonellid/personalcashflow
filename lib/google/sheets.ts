import { google } from "googleapis"

function getClient() {
  const raw = process.env.GOOGLE_SA_KEY_BASE64
  if (!raw) throw new Error("GOOGLE_SA_KEY_BASE64 não configurada")
  const credentials = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"))
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.file",
    ],
  })
  return {
    sheets: google.sheets({ version: "v4", auth }),
    drive: google.drive({ version: "v3", auth }),
    sheetId: process.env.SHEET_ID!,
    driveFolderId: process.env.DRIVE_FOLDER_ID!,
  }
}

export async function readRange(range: string): Promise<string[][]> {
  const { sheets, sheetId } = getClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  })
  return (res.data.values ?? []) as string[][]
}

export async function readSheet(tabName: string): Promise<string[][]> {
  return readRange(`${tabName}!A:Z`)
}