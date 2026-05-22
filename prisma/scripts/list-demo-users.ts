import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    where: { organization: { slug: "demo" } },
    include: { propertyAccess: { include: { property: { select: { name: true } } } } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  })
  for (const u of users) {
    const props = u.propertyAccess.length === 0 ? "TODAS" : u.propertyAccess.map(pa => pa.property.name).join(", ")
    console.log(`${u.email.padEnd(28)} ${u.role.padEnd(12)} ${u.name.padEnd(22)} → ${props}`)
  }
}
main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
