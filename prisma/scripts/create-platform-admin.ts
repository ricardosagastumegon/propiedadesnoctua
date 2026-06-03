// Crea (o asegura) el usuario super-admin de la plataforma Noctua.
// Crea una organización dedicada "Noctua Plataforma" con este usuario como OWNER.
// El email queda whitelisteado en src/lib/platform-admin.ts (built-in).
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const EMAIL = "ricardosagastumegon@gmail.com"
const NAME = "Ricardo Sagastume"
const PASSWORD = "NoctuaAdmin2026!"  // cambiala después desde Configuración
const ORG_NAME = "Noctua Plataforma"
const ORG_SLUG = "noctua-plataforma"

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: EMAIL } })
  if (existing) {
    console.log("El usuario ya existe:", EMAIL, "→ org", existing.organizationId)
    console.log("Reseteando su password a:", PASSWORD)
    await prisma.user.update({
      where: { email: EMAIL },
      data: { passwordHash: await bcrypt.hash(PASSWORD, 12), mustChangePassword: false, isActive: true },
    })
    return
  }

  // ¿existe la org?
  let org = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } })
  if (!org) {
    org = await prisma.organization.create({
      data: { name: ORG_NAME, slug: ORG_SLUG, type: "COMPANY", currency: "GTQ", timezone: "America/Guatemala" },
    })
    await prisma.organizationSettings.create({
      data: { organizationId: org.id, prepaymentCapPercentage: 80 },
    })
  }

  const user = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: EMAIL,
      name: NAME,
      passwordHash: await bcrypt.hash(PASSWORD, 12),
      role: "OWNER",
      authorityPolicy: "ALONE",
      canAcceptServices: true,
      isActive: true,
      mustChangePassword: false,
    },
  })

  console.log("✓ Usuario plataforma creado:")
  console.log("  email:   ", user.email)
  console.log("  password:", PASSWORD)
  console.log("  org:     ", org.name, `(${org.slug})`)
  console.log("\nEntrá en noctuapo.com/login con esas credenciales. Verás el link 'Admin (tenants)' en el menú.")
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
