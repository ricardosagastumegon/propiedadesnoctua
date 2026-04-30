import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      name: "Familia Demo",
      slug: "demo",
      type: "FAMILY",
      taxId: "12345678-9",
    },
  })

  const passwordHash = await bcrypt.hash("demo1234", 10)

  await prisma.user.upsert({
    where: { email: "demo@inmobiliaria.gt" },
    update: {},
    create: {
      email: "demo@inmobiliaria.gt",
      name: "Administrador Demo",
      passwordHash,
      role: "OWNER",
      organizationId: org.id,
    },
  })

  const existing = await prisma.property.count({ where: { organizationId: org.id } })
  if (existing === 0) {
    await prisma.property.createMany({
      data: [
        {
          organizationId: org.id,
          name: "Casa Cayala",
          alias: "Casa principal",
          type: "HOUSE",
          addressLine: "Boulevard Cayala 12-34",
          zone: "Zona 16",
          city: "Guatemala",
          department: "Guatemala",
          bedrooms: 4,
          bathrooms: 3.5,
          builtArea: 320,
          currentValue: 2800000,
        },
        {
          organizationId: org.id,
          name: "Chalet Monterrico",
          type: "CHALET",
          addressLine: "Aldea Monterrico, frente al mar",
          city: "Taxisco",
          department: "Santa Rosa",
          bedrooms: 5,
          bathrooms: 4,
          builtArea: 280,
          currentValue: 1500000,
        },
        {
          organizationId: org.id,
          name: "Apto Zona 14",
          type: "APARTMENT",
          addressLine: "Avenida Las Americas 8-50, Edificio Tiffany",
          zone: "Zona 14",
          city: "Guatemala",
          department: "Guatemala",
          bedrooms: 2,
          bathrooms: 2,
          builtArea: 110,
          currentValue: 950000,
        },
      ],
    })
  }

  console.log("Seed completo. Login: demo@inmobiliaria.gt / demo1234")
}

main().finally(() => prisma.$disconnect())