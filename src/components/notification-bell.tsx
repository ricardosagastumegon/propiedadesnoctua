import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Bell } from "lucide-react"

export async function NotificationBell() {
  const session = await auth()
  if (!session) return null
  const userId = session.user.id

  const count = await prisma.notification.count({ where: { userId, isRead: false } })

  return (
    <Link
      href="/notificaciones"
      className="relative inline-flex items-center justify-center size-9 rounded-lg hover:bg-muted transition-colors"
    >
      <Bell className="size-5 text-muted-foreground" />
      {count > 0 && (
        <span className="absolute top-1 right-1 size-4 bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center leading-none">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  )
}
