import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/permissions"
import { PageHeader } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import { Map as MapIcon } from "lucide-react"
import { LinkCard } from "./_link-card"

export const dynamic = "force-dynamic"

const STAGES = [
  { key: "NEW", label: "Nuevas", cls: "bg-blue-100 text-blue-800" },
  { key: "OFFERED", label: "Ofertadas", cls: "bg-amber-100 text-amber-800" },
  { key: "ACCEPTED", label: "Aceptadas", cls: "bg-emerald-100 text-emerald-800" },
  { key: "DISCARDED", label: "Descartadas", cls: "bg-gray-100 text-gray-600" },
] as const

function money(n: number | null, c: string) {
  if (n == null) return null
  return `${c === "USD" ? "$" : "Q"} ${n.toLocaleString("es-GT", { minimumFractionDigits: 0 })}`
}

export default async function AdquisicionesPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = session.user.organizationId
  const user = { id: session.user.id, role: session.user.role, organizationId: orgId }
  if (!can(user, "adquisiciones", "view")) redirect("/dashboard")
  const canEdit = can(user, "adquisiciones", "edit")

  const [candidates, settings] = await Promise.all([
    prisma.acquisitionCandidate.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "desc" } }),
    prisma.organizationSettings.findUnique({ where: { organizationId: orgId }, select: { acquisitionToken: true } }),
  ])

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <PageHeader title="Adquisiciones" description="Propiedades que te envían los agentes para analizar y comprar." />
        <Link href="/adquisiciones/mapa" className="text-sm inline-flex items-center gap-1 rounded-lg border px-3 py-2 hover:bg-muted/50">
          <MapIcon className="size-4" /> Ver mapa
        </Link>
      </div>

      <LinkCard initialToken={settings?.acquisitionToken ?? null} canEdit={canEdit} />

      {candidates.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Todavía no recibiste propiedades. Compartí tu link con los agentes para empezar.
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {STAGES.map(stage => {
            const items = candidates.filter(c => c.stage === stage.key)
            return (
              <div key={stage.key} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stage.cls}`}>{stage.label}</span>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
                {items.map(c => (
                  <Link key={c.id} href={`/adquisiciones/${c.id}`}>
                    <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer overflow-hidden">
                      {c.galleryUrls[0] && (
                        <img src={c.galleryUrls[0]} alt="" className="w-full h-24 object-cover rounded-md mb-2" />
                      )}
                      <div className="font-medium text-sm line-clamp-2">{c.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {[c.zone, c.city, c.department].filter(Boolean).join(", ") || "Sin ubicación"}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-semibold text-[#12182A]">{money(c.price, c.currency) ?? "—"}</span>
                        {c.agentName && <span className="text-[10px] text-muted-foreground truncate max-w-[90px]">{c.agentName}</span>}
                      </div>
                    </Card>
                  </Link>
                ))}
                {items.length === 0 && <div className="text-xs text-muted-foreground/60 px-1 py-3">—</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
