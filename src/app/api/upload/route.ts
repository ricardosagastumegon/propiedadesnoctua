import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { uploadFile, isStorageConfigured } from "@/lib/storage"
import { logError } from "@/lib/observability"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: "Storage no configurado. Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno." },
      { status: 500 },
    )
  }

  const orgId = session.user.organizationId
  if (!orgId) return NextResponse.json({ error: "Sin organizacion en la sesion" }, { status: 400 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "FormData inválido" }, { status: 400 })
  }

  const file = formData.get("file") as File | null
  const type = (formData.get("type") as string) || "general"

  if (!file) return NextResponse.json({ error: "Sin archivo" }, { status: 400 })

  try {
    const result = await uploadFile(file, type, orgId)
    return NextResponse.json({ url: result.url, path: result.path })
  } catch (e) {
    const msg = (e as Error).message
    logError(e, { area: "upload", orgId, extra: { type, fileName: file.name, fileSize: file.size } })
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
