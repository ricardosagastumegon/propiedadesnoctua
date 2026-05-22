// Repara todos los tenants existentes — idempotente.
// Crea OrganizationSettings y los AssetRecordTypes del sistema si faltan.
// Run: pnpm tsx prisma/scripts/repair-tenants.ts
import { repairAllTenants } from "@/lib/tenant"

async function main() {
  const results = await repairAllTenants()
  console.log(`Reparados ${results.length} tenants:\n`)
  for (const r of results) {
    const fixed = []
    if (r.fixed.organizationSettings) fixed.push("OrgSettings")
    if (r.fixed.assetRecordTypes > 0) fixed.push(`${r.fixed.assetRecordTypes} AssetRecordTypes`)
    const status = fixed.length > 0 ? `📦 reparó: ${fixed.join(", ")}` : "✓ ya estaba completo"
    console.log(`  ${r.organizationName.padEnd(30)} ${status}`)
  }
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1) })
