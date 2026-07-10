import { NextResponse } from "next/server"

// Devuelve la versión del deploy que está corriendo AHORA. El cliente compara
// contra la versión con la que se cargó; si difiere, hay una versión nueva.
export const dynamic = "force-dynamic"

export function GET() {
  return NextResponse.json(
    { version: process.env.NEXT_PUBLIC_APP_VERSION || "dev" },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  )
}
