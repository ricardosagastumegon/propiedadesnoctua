// Crear un tenant NUEVO con todo lo necesario para que funcione.
// Uso: pnpm tsx prisma/scripts/create-tenant.ts <slug> <nombre> <adminEmail> <adminName> <password>
//
// Ejemplo:
//   pnpm tsx prisma/scripts/create-tenant.ts noctua "Noctua Propiedades" admin@noctuapo.com "Ricardo" "Pass1234!"
import { createOrganization } from "@/lib/tenant"

async function main() {
  const [slug, name, adminEmail, adminName, adminPassword] = process.argv.slice(2)
  if (!slug || !name || !adminEmail || !adminName || !adminPassword) {
    console.error("Uso: pnpm tsx prisma/scripts/create-tenant.ts <slug> <nombre> <email-admin> <nombre-admin> <password>")
    process.exit(1)
  }

  const result = await createOrganization({
    slug, name,
    adminEmail, adminName, adminPassword,
    forcePasswordChange: false, // dejá la password sin cambio forzado para CLI; cambiala en UI
  })
  console.log("\n✓ Tenant creado:")
  console.log(`  organizationId: ${result.organizationId}`)
  console.log(`  adminUserId:    ${result.adminUserId}`)
  console.log(`  email login:    ${adminEmail}`)
  console.log(`  password:       ${adminPassword}`)
  console.log("\nRecursos creados:")
  console.log("  ✓ Organization")
  console.log("  ✓ OrganizationSettings (prepaymentCapPercentage=80)")
  console.log("  ✓ Usuario OWNER con authorityPolicy=ALONE, canAcceptServices=true")
  console.log("  ✓ 6 AssetRecordTypes del sistema (INSURANCE, REGISTRATION, LICENSE, INSPECTION, WARRANTY, PERMIT)")
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error(`✗ ${(e as Error).message}`); process.exit(1) })
