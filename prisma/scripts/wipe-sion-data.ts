// Borra TODOS los datos del tenant SION dejando intactos:
//   - La organización SION
//   - OrganizationSettings de SION
//   - El usuario Angeles (active)
//   - Los AssetRecordTypes del sistema (los 6 base)
//
// Pensado para resetear el tenant SION a estado limpio antes de operar real.
// NO toca otras organizaciones (demo, etc).
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const org = await prisma.organization.findUnique({ where: { slug: "sion" } })
  if (!org) throw new Error("Org SION no existe")

  const angeles = await prisma.user.findUnique({
    where: { email: "angelesquezadaoch@gmail.com" },
  })
  if (!angeles) throw new Error("Usuario Angeles no existe")
  if (angeles.organizationId !== org.id) throw new Error("Angeles no pertenece a SION")

  console.log("Wipe target:")
  console.log("  org:    ", org.id, `(${org.name})`)
  console.log("  preserve user:", angeles.id, `(${angeles.email})`)
  console.log()

  const sionId = org.id
  const angelesId = angeles.id

  // Contadores antes
  const counts = {
    properties: await prisma.property.count({ where: { organizationId: sionId } }),
    tenants: await prisma.tenant.count({ where: { organizationId: sionId } }),
    contracts: await prisma.contract.count({ where: { organizationId: sionId } }),
    invoices: await prisma.invoice.count({ where: { organizationId: sionId } }),
    payments: await prisma.payment.count({ where: { organizationId: sionId } }),
    maintenances: await prisma.maintenanceRequest.count({ where: { organizationId: sionId } }),
    assets: await prisma.asset.count({ where: { organizationId: sionId } }),
    projects: await prisma.project.count({ where: { organizationId: sionId } }),
    vendors: await prisma.vendor.count({ where: { organizationId: sionId } }),
    quotes: await prisma.quote.count({ where: { organizationId: sionId } }),
    employees: await prisma.employee.count({ where: { organizationId: sionId } }),
    approvals: await prisma.approvalRequest.count({ where: { organizationId: sionId } }),
    acceptances: await prisma.serviceAcceptance.count({ where: { organizationId: sionId } }),
    notifications: await prisma.notification.count({ where: { organizationId: sionId } }),
    pettyCashes: await prisma.pettyCash.count({ where: { organizationId: sionId } }),
    activityLogs: await prisma.activityLog.count({ where: { organizationId: sionId } }),
    documents: await prisma.document.count({ where: { organizationId: sionId } }),
    expenses: await prisma.expense.count({ where: { organizationId: sionId } }),
    users: await prisma.user.count({ where: { organizationId: sionId } }),
  }
  console.log("Antes:")
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(15)} ${v}`)
  console.log()

  // Confirmación visual (script destructivo)
  console.log("Borrando TODO el contenido del tenant SION en 3 segundos…")
  await new Promise(r => setTimeout(r, 3000))

  // 1. Niños profundos (referencian a otros que están scoped por orgId)
  await prisma.maintenanceTimelineEvent.deleteMany({
    where: { ticket: { organizationId: sionId } },
  })
  await prisma.maintenancePhoto.deleteMany({
    where: { request: { organizationId: sionId } },
  })
  await prisma.ticketPayment.deleteMany({
    where: { ticket: { organizationId: sionId } },
  })
  await prisma.partidaPayment.deleteMany({
    where: { partida: { project: { organizationId: sionId } } },
  })
  await prisma.quoteItem.deleteMany({
    where: { quote: { organizationId: sionId } },
  })
  await prisma.pettyCashMovement.deleteMany({
    where: { pettyCash: { organizationId: sionId } },
  })
  await prisma.assetServiceLog.deleteMany({
    where: { asset: { organizationId: sionId } },
  })
  await prisma.assetRecord.deleteMany({
    where: { asset: { organizationId: sionId } },
  })
  await prisma.serviceAcceptancePhoto.deleteMany({
    where: { acceptance: { organizationId: sionId } },
  })
  await prisma.invoiceItem.deleteMany({
    where: { invoice: { organizationId: sionId } },
  })
  await prisma.utilityBill.deleteMany({
    where: { account: { property: { organizationId: sionId } } },
  })
  await prisma.employeeAssignment.deleteMany({
    where: { employee: { organizationId: sionId } },
  })

  // 2. Entidades scoped al org (algunas con dependencias entre sí — orden importa)
  // ApprovalRequest puede referenciar Quote por relatedId (sin FK) → safe orden cualquiera
  await prisma.serviceAcceptance.deleteMany({ where: { organizationId: sionId } })
  await prisma.approvalRequest.deleteMany({ where: { organizationId: sionId } })
  await prisma.projectPartida.deleteMany({ where: { project: { organizationId: sionId } } })
  await prisma.projectTask.deleteMany({ where: { project: { organizationId: sionId } } })
  await prisma.projectCost.deleteMany({ where: { project: { organizationId: sionId } } })
  await prisma.quote.deleteMany({ where: { organizationId: sionId } })
  await prisma.vendorInvoice.deleteMany({ where: { organizationId: sionId } })
  await prisma.payment.deleteMany({ where: { organizationId: sionId } })
  await prisma.invoice.deleteMany({ where: { organizationId: sionId } })
  await prisma.maintenanceRequest.deleteMany({ where: { organizationId: sionId } })
  await prisma.utilityAccount.deleteMany({ where: { property: { organizationId: sionId } } })
  await prisma.asset.deleteMany({ where: { organizationId: sionId } })
  await prisma.project.deleteMany({ where: { organizationId: sionId } })
  await prisma.contract.deleteMany({ where: { organizationId: sionId } })
  await prisma.pettyCash.deleteMany({ where: { organizationId: sionId } })
  await prisma.expense.deleteMany({ where: { organizationId: sionId } })
  await prisma.notification.deleteMany({ where: { organizationId: sionId } })
  await prisma.activityLog.deleteMany({ where: { organizationId: sionId } })
  await prisma.document.deleteMany({ where: { organizationId: sionId } })
  await prisma.propertyUnit.deleteMany({ where: { property: { organizationId: sionId } } })
  await prisma.property.deleteMany({ where: { organizationId: sionId } })
  await prisma.tenant.deleteMany({ where: { organizationId: sionId } })
  await prisma.vendor.deleteMany({ where: { organizationId: sionId } })
  await prisma.employee.deleteMany({ where: { organizationId: sionId } })

  // 3. Usuarios: limpiar accesos y borrar todos excepto Angeles.
  // userPropertyAccess y cosignPolicy cascadean al borrar el user.
  // Para Angeles: nuke su PropertyAccess (debe tener acceso a TODAS — array vacío = todas)
  await prisma.userPropertyAccess.deleteMany({
    where: { user: { organizationId: sionId } },
  })
  await prisma.cosignPolicy.deleteMany({
    where: { user: { organizationId: sionId, NOT: { id: angelesId } } },
  })
  await prisma.passwordResetToken.deleteMany({
    where: { user: { organizationId: sionId } },
  })
  const usersDeleted = await prisma.user.deleteMany({
    where: { organizationId: sionId, NOT: { id: angelesId } },
  })

  // 4. Asegurar Angeles activa, OWNER, ALONE, sin mustChangePassword
  await prisma.user.update({
    where: { id: angelesId },
    data: {
      isActive: true,
      role: "OWNER",
      authorityPolicy: "ALONE",
      canAcceptServices: true,
      mustChangePassword: false,
    },
  })

  console.log()
  console.log("Wipe completo.")
  console.log(`  usuarios eliminados:   ${usersDeleted.count}`)
  console.log()

  // Verificación
  const after = {
    properties: await prisma.property.count({ where: { organizationId: sionId } }),
    tenants: await prisma.tenant.count({ where: { organizationId: sionId } }),
    contracts: await prisma.contract.count({ where: { organizationId: sionId } }),
    maintenances: await prisma.maintenanceRequest.count({ where: { organizationId: sionId } }),
    assets: await prisma.asset.count({ where: { organizationId: sionId } }),
    projects: await prisma.project.count({ where: { organizationId: sionId } }),
    vendors: await prisma.vendor.count({ where: { organizationId: sionId } }),
    employees: await prisma.employee.count({ where: { organizationId: sionId } }),
    users: await prisma.user.count({ where: { organizationId: sionId } }),
    settingsKept: await prisma.organizationSettings.findUnique({ where: { organizationId: sionId } }),
    assetRecordTypesKept: await prisma.assetRecordType.count({ where: { organizationId: sionId } }),
  }
  console.log("Después:")
  for (const [k, v] of Object.entries(after)) {
    if (k === "settingsKept") {
      const s = v as { prepaymentCapPercentage: number } | null
      console.log(`  settings:            ${s ? `cap=${s.prepaymentCapPercentage}%` : "FALTA"}`)
    } else console.log(`  ${k.padEnd(20)} ${v}`)
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
