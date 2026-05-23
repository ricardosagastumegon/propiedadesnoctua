import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import { NotificationBell } from "@/components/notification-bell"
import { SidebarNav } from "@/components/shared/nav-link"
import { DevUserSwitcher } from "@/components/shared/dev-user-switcher"
import { AppShell, LogoutButton } from "@/components/shared/app-shell"
import { prisma } from "@/lib/prisma"

const SHOW_DEV_SWITCHER = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS === "true"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")
  const user = session.user
  const orgId = user.organizationId

  const [pendingApprovals, pendingAcceptances, devUsers] = await Promise.all([
    prisma.approvalRequest.count({
      where: { organizationId: orgId, status: { in: ["PENDING", "PENDING_COSIGN"] } },
    }),
    prisma.serviceAcceptance.count({
      where: { organizationId: orgId, status: "PENDING" },
    }),
    SHOW_DEV_SWITCHER
      ? prisma.user.findMany({
          where: { organizationId: orgId, isActive: true },
          orderBy: { role: "asc" },
          select: { email: true, name: true, role: true },
        })
      : Promise.resolve([]),
  ])

  return (
    <AppShell
      brand="Inmobiliaria Pro"
      brandSubtitle={user.organizationName}
      userName={user.name ?? "Usuario"}
      userEmail={user.email ?? ""}
      logoutForm={
        <form
          action={async () => {
            "use server"
            await signOut({ redirectTo: "/login" })
          }}
        >
          <LogoutButton />
        </form>
      }
      sidebar={
        <SidebarNav
          pendingApprovals={pendingApprovals}
          pendingAcceptances={pendingAcceptances}
          user={{ id: user.id, role: user.role, organizationId: user.organizationId }}
        />
      }
      headerExtras={
        <>
          {SHOW_DEV_SWITCHER && devUsers.length > 0 && <DevUserSwitcher users={devUsers} />}
          <NotificationBell />
        </>
      }
    >
      {children}
    </AppShell>
  )
}
