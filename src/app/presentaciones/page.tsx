import type { Metadata } from "next"
import { PresentacionDeck } from "./_deck"

export const metadata: Metadata = {
  title: "Noctua Properties — Presentación",
  description: "Conocé Noctua Properties: SaaS de gestión integral para portafolios de propiedades.",
}

export const dynamic = "force-static"

export default function PresentacionesPage() {
  return <PresentacionDeck />
}
