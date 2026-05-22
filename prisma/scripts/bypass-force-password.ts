// Desbloquea a Angeles: pone mustChangePassword=false para que pueda entrar
// directamente con "angeles" sin pasar por /cambiar-password.
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.update({
    where: { email: "angelesquezadaoch@gmail.com" },
    data: { mustChangePassword: false },
    select: { id: true, email: true, name: true, mustChangePassword: true, organizationId: true },
  })
  console.log("Bypass aplicado:")
  console.log("  user:               ", user.email, `(${user.name})`)
  console.log("  mustChangePassword: ", user.mustChangePassword)
  console.log("  organizationId:     ", user.organizationId)
  console.log("\nAhora podés entrar con password 'angeles' directo al dashboard.")
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
