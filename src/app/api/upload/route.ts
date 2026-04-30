import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const orgId = (session.user as any).organizationId as string
  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const type = (formData.get("type") as string) || "general"

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File too large" }, { status: 400 })

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin"
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const dir = join(process.cwd(), "public", "uploads", type, orgId)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, safeName), Buffer.from(await file.arrayBuffer()))

  return NextResponse.json({ url: `/uploads/${type}/${orgId}/${safeName}` })
}
