// One-shot script to create the SION tenant alongside the demo org.
// Run with: pnpm tsx prisma/scripts/create-tenant-sion.ts
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Creating tenant: SION + admin Angeles Quezada")

  const hash = await bcrypt.hash("angeles", 10)

  const org = await prisma.organization.upsert({
    where: { slug: "sion" },
    update: { name: "SION" },
    create: {
      name: "SION",
      slug: "sion",
      type: "FAMILY",
      currency: "GTQ",
      timezone: "America/Guatemala",
    },
  })
  console.log(`  org.id = ${org.id}`)

  await prisma.organizationSettings.upsert({
    where: { organizationId: org.id },
    update: { prepaymentCapPercentage: 80 },
    create: { organizationId: org.id, prepaymentCapPercentage: 80 },
  })

  const user = await prisma.user.upsert({
    where: { email: "angelesquezadaoch@gmail.com" },
    update: {
      name: "Angeles Quezada",
      role: "ADMIN",
      authorityPolicy: "ALONE",
      canAcceptServices: true,
      organizationId: org.id,
      passwordHash: hash,
      isActive: true,
    },
    create: {
      email: "angelesquezadaoch@gmail.com",
      name: "Angeles Quezada",
      passwordHash: hash,
      role: "ADMIN",
      authorityPolicy: "ALONE",
      canAcceptServices: true,
      organizationId: org.id,
      isActive: true,
    },
  })
  console.log(`  user.id = ${user.id}`)

  console.log("\nReady. Login:")
  console.log("  email:    angelesquezadaoch@gmail.com")
  console.log("  password: angeles")
  console.log("  org:      SION")
  console.log("  role:     ADMIN (canAcceptServices=true, authorityPolicy=ALONE)")
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
