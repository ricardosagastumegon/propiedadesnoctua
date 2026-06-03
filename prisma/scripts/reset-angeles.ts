import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
const prisma = new PrismaClient()

const EMAIL = "angelesquezadaoch@gmail.com"
const PASSWORD = "Sion2026!"

async function main() {
  const u = await prisma.user.update({
    where: { email: EMAIL },
    data: { passwordHash: await bcrypt.hash(PASSWORD, 12), mustChangePassword: false, isActive: true },
    select: { email: true, name: true, isActive: true, organizationId: true },
  })
  console.log("✓ Password reseteada:")
  console.log("  email:   ", u.email)
  console.log("  password:", PASSWORD)
  console.log("  activo:  ", u.isActive)
}
main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
