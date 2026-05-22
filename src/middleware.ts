import { NextResponse } from "next/server"
import { auth } from "@/auth"

const PUBLIC_PATHS = new Set(["/login", "/cambiar-password"])

export default auth(req => {
  const { nextUrl } = req
  const session = req.auth

  // Rutas técnicas de Next/Auth se dejan pasar
  if (
    nextUrl.pathname.startsWith("/api/auth") ||
    nextUrl.pathname.startsWith("/_next") ||
    nextUrl.pathname.startsWith("/static") ||
    nextUrl.pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // Sin sesión → solo login es accesible
  if (!session?.user) {
    if (nextUrl.pathname === "/login") return NextResponse.next()
    return NextResponse.redirect(new URL("/login", nextUrl.origin))
  }

  // Con sesión: si tiene mustChangePassword, todo redirige a /cambiar-password
  // excepto la propia ruta y /api/auth (signout).
  const user = session.user as unknown as { mustChangePassword?: boolean }
  if (user.mustChangePassword && nextUrl.pathname !== "/cambiar-password") {
    return NextResponse.redirect(new URL("/cambiar-password", nextUrl.origin))
  }

  // Si ya cambió la password y trata de entrar a /login, mandalo al dashboard
  if (nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl.origin))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Ejecutá en todo excepto recursos estáticos
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
}
