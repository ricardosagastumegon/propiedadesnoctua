import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { formatDate } from "@/lib/format"
import { MarkAllReadButton } from "./_mark-read"
import { Bell } from "lucide-react"

export default async function NotificacionesPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const userId = session.user!.id!

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  const unread = notifications.filter(n => !n.isRead).length

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <PageHeader title="Notificaciones" description={`${unread} sin leer`}>
        {unread > 0 && <MarkAllReadButton />}
      </PageHeader>

      {notifications.length === 0 ? (
        <Card><EmptyState icon={Bell} title="Sin notificaciones" description="Todo esta al dia." /></Card>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n.id} className={`border rounded-lg p-4 ${!n.isRead ? "border-foreground/20 bg-muted/30" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(n.createdAt)}</p>
                </div>
                {!n.isRead && <div className="size-2 rounded-full bg-foreground mt-1 shrink-0" />}
              </div>
              {n.link && (
                <Link href={n.link} className="text-xs text-muted-foreground hover:underline mt-1 inline-block">
                  Ver detalle
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
