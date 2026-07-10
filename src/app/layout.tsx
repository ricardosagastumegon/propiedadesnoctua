import type { Metadata } from "next"
import { Inter, Fraunces } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { Providers } from "./providers"
import { InstallPrompt } from "@/components/shared/install-prompt"
import { VersionWatcher } from "@/components/shared/version-watcher"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" })
// Fraunces es la fuente de títulos (display). No la precargamos: el LCP es texto de
// cuerpo (Inter). Así evitamos el warning "preloaded but not used" y ahorramos ancho de banda.
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", preload: false })

export const metadata: Metadata = {
  title: "Noctua · Tu Propiedad",
  description: "Gestión profesional de propiedades y patrimonio",
  manifest: "/manifest.webmanifest",
  applicationName: "Noctua",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Noctua",
  },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#12182A",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        <Providers>{children}</Providers>
        <Toaster richColors position="top-right" />
        <InstallPrompt />
        <VersionWatcher />
      </body>
    </html>
  )
}