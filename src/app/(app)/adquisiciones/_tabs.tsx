"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const TABS = [
  { href: "/adquisiciones", label: "Para compras" },
  { href: "/adquisiciones/puntos", label: "Puntos de interés" },
  { href: "/adquisiciones/mapa", label: "Mapa" },
]

export function AcqTabs() {
  const path = usePathname()
  return (
    <div className="flex gap-1 border-b overflow-x-auto">
      {TABS.map(t => {
        const active = t.href === "/adquisiciones" ? path === "/adquisiciones" : path.startsWith(t.href)
        return (
          <Link key={t.href} href={t.href}
            className={`px-4 py-2 text-sm border-b-2 -mb-px whitespace-nowrap ${active ? "border-[#12182A] font-medium text-[#12182A]" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
