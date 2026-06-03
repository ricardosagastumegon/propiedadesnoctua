import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()
async function main() {
  const orgId = "cmpgxjg1400f27njcca38mjo8" // SION
  const props = await prisma.property.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true, status: true, latitude: true, longitude: true,
      mapPolygon: true, parcels: { select: { id: true, mapPolygon: true } } },
  })
  console.log("Propiedades SION:")
  for (const p of props) {
    const hasCoord = p.latitude != null && p.longitude != null
    const hasPoly = !!p.mapPolygon
    const parcelsWithPoly = p.parcels.filter(pc => !!pc.mapPolygon).length
    console.log(`  - ${p.name}`)
    console.log(`      status=${p.status} | lat/lon=${hasCoord ? "SÍ" : "NO"} | polígono=${hasPoly ? "SÍ" : "NO"} | predios c/contorno=${parcelsWithPoly}/${p.parcels.length}`)
  }
}
main().catch(e => { console.error("ERR", e); process.exit(1) }).finally(() => prisma.$disconnect())
