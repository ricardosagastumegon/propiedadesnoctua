// One-shot check: confirm SION + Angeles exist
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
  const org = await prisma.organization.findUnique({ where: { slug: "sion" } })
  console.log("SION org:", org ? `${org.id} (${org.name})` : "❌ NO EXISTE")

  const user = await prisma.user.findUnique({
    where: { email: "angelesquezadaoch@gmail.com" },
    include: { organization: { select: { name: true, slug: true } } },
  })
  if (!user) {
    console.log("❌ Angeles NO EXISTE")
  } else {
    console.log("Angeles user:")
    console.log("  id:                ", user.id)
    console.log("  email:             ", user.email)
    console.log("  name:              ", user.name)
    console.log("  role:              ", user.role)
    console.log("  authorityPolicy:   ", user.authorityPolicy)
    console.log("  canAcceptServices: ", user.canAcceptServices)
    console.log("  isActive:          ", user.isActive)
    console.log("  organization:      ", `${user.organization.name} (${user.organization.slug})`)
    console.log("  has password:      ", !!user.passwordHash)
  }

  if (org) {
    const settings = await prisma.organizationSettings.findUnique({ where: { organizationId: org.id } })
    console.log("OrgSettings:", settings ? `cap=${settings.prepaymentCapPercentage}%` : "❌ falta")
  }
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
