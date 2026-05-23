import type { Metadata } from "next"
import { Inter, Fraunces } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { Providers } from "./providers"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" })
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" })

export const metadata: Metadata = {
  title: "Inmobiliaria Pro",
  description: "Gestion profesional de propiedades en renta",
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#2D2D2D",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        <Providers>{children}</Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}