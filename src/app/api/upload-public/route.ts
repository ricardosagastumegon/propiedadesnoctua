import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { uploadFile, isStorageConfigured } from "@/lib/storage"
import { logError } from "@/lib/observability"

export const dynamic = "force-dynamic"

// Subida PÚBLICA scoped a un token de Adquisiciones. Un agente externo (sin login)
// sube fotos de la propiedad que envía. Se valida el token contra una org real.
export async function POST(req: NextRequest) {
  if (!isStorageConfigured()) {
    return NextResponse.json({ error: "Storage no configurado." }, { status: 500 })
  }

  let formData: FormData
  try { formData = await req.formData() } catch { return NextResponse.json({ error: "FormData inválido" }, { status: 400 }) }

  const token = (formData.get("token") as string) || ""
  const file = formData.get("file") as File | null
  if (!token) return NextResponse.json({ error: "Sin token" }, { status: 400 })
  if (!file) return NextResponse.json({ error: "Sin archivo" }, { status: 400 })

  const link = await prisma.acquisitionLink.findUnique({
    where: { token },
    select: { organizationId: true, isActive: true },
  })
  if (!link || !link.isActive) return NextResponse.json({ error: "Link inválido" }, { status: 403 })

  try {
    const result = await uploadFile(file, "acquisitions", link.organizationId)
    return NextResponse.json({ url: result.url, path: result.path })
  } catch (e) {
    logError(e, { area: "upload-public", orgId: link.organizationId, extra: { fileName: file.name } })
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
