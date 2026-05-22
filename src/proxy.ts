import { NextResponse } from "next/server"
import { auth } from "@/auth"

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
    if (nextUrl.pathname === "/login") return NextResponse.next()
    return NextResponse.redirect(new URL("/login", nextUrl.origin))
  }

  const user = session.user as unknown as { mustChangePassword?: boolean }
  if (user.mustChangePassword && nextUrl.pathname !== "/cambiar-password") {
    return NextResponse.redirect(new URL("/cambiar-password", nextUrl.origin))
  }

  if (nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl.origin))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
