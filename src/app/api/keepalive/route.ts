import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Keep-alive: el Vercel Cron pega acá 1 vez al día y hace una consulta trivial
// para resetear el contador de inactividad de Supabase (free pausa a los ~7 días).
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  // Si hay CRON_SECRET, exigir el header que Vercel Cron envía automáticamente.
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get("authorization")
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }
  }

  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ ok: true, ts: new Date().toISOString() })
  } catch {
    return NextResponse.json({ ok: false, error: "db unreachable" }, { status: 503 })
  }
}
