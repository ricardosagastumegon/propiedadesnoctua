import { NextResponse } from "next/server"
import { auth } from "@/auth"

// Rutas accesibles sin sesión.
const PUBLIC_PATHS = new Set<string>([
  "/",
  "/login",
  "/signup",
  "/recuperar-password",
  "/restablecer-password",
  "/presentaciones",
])

// Si el usuario ya está logueado, estas rutas lo redirigen al dashboard.
// La landing "/" NO va acá — usuarios autenticados también pueden visitarla
// (ven el botón "Ir al panel" en el header).
const REDIRECT_IF_LOGGED_IN = new Set<string>([
  "/login",
  "/signup",
])

export const proxy = auth(req => {
  const { nextUrl } = req
  const session = req.auth

  if (
    nextUrl.pathname.startsWith("/api/auth") ||
    nextUrl.pathname.startsWith("/_next") ||
    nextUrl.pathname.startsWith("/static") ||
    nextUrl.pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  if (!session?.user) {
    if (PUBLIC_PATHS.has(nextUrl.pathname)) return NextResponse.next()
    return NextResponse.redirect(new URL("/login", nextUrl.origin))
  }

  const user = session.user as unknown as { mustChangePassword?: boolean }
  if (user.mustChangePassword && nextUrl.pathname !== "/cambiar-password") {
    return NextResponse.redirect(new URL("/cambiar-password", nextUrl.origin))
  }

  if (REDIRECT_IF_LOGGED_IN.has(nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl.origin))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
