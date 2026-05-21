// Reset Angeles' password back to "angeles" (the seed v7 accidentally reset it
// to "demo1234" because it reused the shared bcrypt hash).
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash("angeles", 10)
  const user = await prisma.user.update({
    where: { email: "angelesquezadaoch@gmail.com" },
    data: { passwordHash: hash },
    select: { id: true, email: true, name: true, organizationId: true },
  })
  console.log("Password reset:")
  console.log("  user:     ", user.email, `(${user.name})`)
  console.log("  password: angeles")
  console.log("  id:       ", user.id)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
