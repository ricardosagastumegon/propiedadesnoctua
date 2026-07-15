import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/permissions"
import { PageHeader } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import { Map as MapIcon } from "lucide-react"
import { LinksManager, type LinkRow } from "./_links-manager"
import { Board, type BoardItem } from "./_board"
import { pricePerV2, dealScore } from "@/lib/deal-score"

export const dynamic = "force-dynamic"

export default async function AdquisicionesPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const me = session.user.organizationId
  const user = { id: session.user.id, role: session.user.role, organizationId: me }
  if (!can(user, "adquisiciones", "view")) redirect("/dashboard")
  const canEdit = can(user, "adquisiciones", "edit")

  const [candidates, links, settings] = await Promise.all([
    prisma.acquisitionCandidate.findMany({
      where: { OR: [{ organizationId: me }, { link: { intermediaryOrgId: me } }] },
      orderBy: { createdAt: "desc" },
      include: { link: { select: { name: true } } },
    }),
    prisma.acquisitionLink.findMany({
      where: { organizationId: me },
      orderBy: { createdAt: "asc" },
      include: { intermediary: { select: { name: true } } },
    }),
    prisma.organizationSettings.findUnique({ where: { organizationId: me }, select: { intermediaryCode: true } }),
  ])

  const linkRows: LinkRow[] = links.map(l => ({
    id: l.id, name: l.name, token: l.token, brief: l.brief,
    isActive: l.isActive, intermediaryName: l.intermediary?.name ?? null,
  }))

  // Referencia automática: precio/v² promedio por departamento (de tu propia data)
  const deptSum = new Map<string, { sum: number; n: number }>()
  for (const c of candidates) {
    const ppv = pricePerV2(c)
    if (ppv != null && c.department) {
      const e = deptSum.get(c.department) ?? { sum: 0, n: 0 }
      e.sum += ppv; e.n++; deptSum.set(c.department, e)
    }
  }
  const deptAvg = (d: string | null) => { const e = d ? deptSum.get(d) : null; return e && e.n ? e.sum / e.n : null }

  const items: BoardItem[] = candidates.map(c => {
    const ppv = pricePerV2(c)
    const refAvg = (c.refPriceMinV2 != null && c.refPriceMaxV2 != null) ? (c.refPriceMinV2 + c.refPriceMaxV2) / 2 : deptAvg(c.department)
    const score = dealScore(ppv, refAvg, { isCommercial: c.isCommercial, hasLocation: c.latitude != null, photos: c.galleryUrls.length })
    return {
      id: c.id, title: c.title, stage: c.stage, price: c.price, currency: c.currency,
      department: c.department, city: c.city, zone: c.zone,
      cover: c.galleryUrls[0] ?? null, linkName: c.link?.name ?? null,
      mirrored: c.organizationId !== me, score,
    }
  })

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <PageHeader title="Adquisiciones" description="Propiedades que te envían los agentes para analizar y comprar." />
        <Link href="/adquisiciones/mapa" className="text-sm inline-flex items-center gap-1 rounded-lg border px-3 py-2 hover:bg-muted/50">
          <MapIcon className="size-4" /> Ver mapa
        </Link>
      </div>

      <LinksManager links={linkRows} canEdit={canEdit} myCode={settings?.intermediaryCode ?? null} />

      {candidates.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Todavía no recibiste propiedades. Compartí un link con los agentes para empezar.
        </Card>
      ) : (
        <Board items={items} />
      )}
    </div>
  )
}
