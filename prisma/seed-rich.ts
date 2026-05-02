/**
 * seed-rich.ts — carga masiva de datos de prueba sobre el seed base.
 * Requiere que seed.ts ya haya corrido (org + usuarios existen).
 * Ejecutar: tsx prisma/seed-rich.ts
 */
import { PrismaClient } from "@prisma/client"
import { subMonths, addMonths, subDays, addDays, subWeeks } from "date-fns"

const prisma = new PrismaClient()
const now = new Date()

// ── helpers ──────────────────────────────────────────────────────────────────
const rand = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const randAmount = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 100) / 100
const daysAgo = (d: number) => subDays(now, d)
const daysAhead = (d: number) => addDays(now, d)

async function main() {
  const org = await prisma.organization.findFirst({ where: { slug: "demo" } })
  if (!org) throw new Error("Org demo no encontrada — corre seed.ts primero")

  const users = await prisma.user.findMany({ where: { organizationId: org.id } })
  const admin    = users.find(u => u.email === "admin@demo.gt")!
  const manager  = users.find(u => u.email === "gerente@demo.gt")!
  const supervisor = users.find(u => u.email === "super@demo.gt")!
  const asst1    = users.find(u => u.email === "asist1@demo.gt")!
  const asst2    = users.find(u => u.email === "asist2@demo.gt")!

  // ── LIMPIEZA idempotente: borrar solo lo que este script agrega ──────────
  console.log("► Limpiando datos anteriores del rich seed…")
  const richPropNames = [
    "Torre Reforma Apt 1201", "Casa Colonia El Maestro", "Local Comercial Miraflores",
    "Chalet Antigua Panorama", "Bodega Centro Logístico Z12", "Apartamento Cayalá Studio",
    "Oficina Premium Zona 15", "Terreno Carretera al Pacifico",
  ]
  const existingRichProps = await prisma.property.findMany({
    where: { organizationId: org.id, name: { in: richPropNames } },
  })
  if (existingRichProps.length > 0) {
    const richPropIds = existingRichProps.map(p => p.id)
    await prisma.notification.deleteMany({ where: { organizationId: org.id, type: { in: ["APPROVAL_PENDING", "MAINTENANCE_URGENT", "INVOICE_OVERDUE"] } } })
    await prisma.approvalRequest.deleteMany({ where: { organizationId: org.id, notes: { contains: "rich" } } })
    // Limpiar contratos de propiedades ricas
    const richContracts = await prisma.contract.findMany({ where: { propertyId: { in: richPropIds } } })
    const richContractIds = richContracts.map(c => c.id)
    await prisma.payment.deleteMany({ where: { contractId: { in: richContractIds } } })
    await prisma.invoice.deleteMany({ where: { contractId: { in: richContractIds } } })
    await prisma.contract.deleteMany({ where: { propertyId: { in: richPropIds } } })
    // Tickets
    const richTicketNums = ["T-007","T-008","T-009","T-010","T-011","T-012","T-013","T-014","T-015","T-016","T-017","T-018","T-019","T-020","T-021","T-022"]
    await prisma.maintenanceRequest.deleteMany({ where: { organizationId: org.id, ticketNumber: { in: richTicketNums } } })
    // Proyectos ricos
    const richProjNames = ["Remodelación Bodega Logística", "Restauración Chalet Antigua", "Paneles Solares Torre Reforma", "Ampliación 2do Nivel Casa Maestro"]
    await prisma.project.deleteMany({ where: { organizationId: org.id, name: { in: richProjNames } } })
    // Cajas chicas de propiedades ricas
    await prisma.pettyCash.deleteMany({ where: { propertyId: { in: richPropIds } } })
    // Facturas de vendors nuevos
    const richVendorNames = ["Fontanería Rápida GT", "Jardines Eternos", "Limpieza Profesional GT", "Cerrajería Segura", "Electrónica Industrial SA", "Constructora Civil del Sur"]
    const richVendors = await prisma.vendor.findMany({ where: { organizationId: org.id, name: { in: richVendorNames } } })
    const richVendorIds = richVendors.map(v => v.id)
    await prisma.vendorInvoice.deleteMany({ where: { vendorId: { in: richVendorIds } } })
    await prisma.vendor.deleteMany({ where: { id: { in: richVendorIds } } })
    await prisma.property.deleteMany({ where: { id: { in: richPropIds } } })
    // Tenants ricos
    const richTenantNames = ["Carlos Eduardo Barrios Paz","Lucia Esperanza Ramos","Distribuidora La Central SA","Jorge Alejandro Xicara","Sandra Patricia Morales Díaz","Servicios Corporativos GT SA","Miguel Angel Cifuentes","Gabriela Ximena Orantes","Tech Solutions Guatemala","Fernando José Alvarado","Verónica del Carmen Pérez","Importadora Andina SA"]
    await prisma.tenant.deleteMany({ where: { organizationId: org.id, fullName: { in: richTenantNames } } })
    // Approval requests extra
    await prisma.approvalRequest.deleteMany({ where: { organizationId: org.id, notes: { contains: "Solicitud de autorización" } } })
    await prisma.approvalRequest.deleteMany({ where: { organizationId: org.id, notes: { contains: "Segundo desembolso" } } })
    await prisma.approvalRequest.deleteMany({ where: { organizationId: org.id, notes: { contains: "Balance bajo" } } })
    await prisma.approvalRequest.deleteMany({ where: { organizationId: org.id, title: { contains: "Autorizar factura FAC-" } } })
  }

  console.log("► Cargando propiedades extra…")

  // ── 8 PROPIEDADES ADICIONALES ─────────────────────────────────────────────
  const props = await Promise.all([
    prisma.property.create({ data: {
      organizationId: org.id,
      name: "Torre Reforma Apt 1201", type: "APARTMENT", status: "RENTED",
      addressLine: "Av. Reforma 7-62 apto 1201", zone: "Zona 9", city: "Guatemala", department: "Guatemala",
      bedrooms: 3, bathrooms: 2, builtArea: 145, currentValue: 1650000,
    }}),
    prisma.property.create({ data: {
      organizationId: org.id,
      name: "Casa Colonia El Maestro", type: "HOUSE", status: "RENTED",
      addressLine: "8a Calle 22-15", zone: "Zona 7", city: "Guatemala", department: "Guatemala",
      bedrooms: 3, bathrooms: 2, builtArea: 200, currentValue: 950000,
    }}),
    prisma.property.create({ data: {
      organizationId: org.id,
      name: "Local Comercial Miraflores", type: "COMMERCIAL", status: "RENTED",
      addressLine: "Calzada Miraflores 13-20 Local 5", zone: "Zona 11", city: "Guatemala", department: "Guatemala",
      builtArea: 60, currentValue: 480000,
    }}),
    prisma.property.create({ data: {
      organizationId: org.id,
      name: "Chalet Antigua Panorama", type: "CHALET", status: "AVAILABLE",
      addressLine: "Finca Panorama Lote 8", city: "Antigua Guatemala", department: "Sacatepequez",
      bedrooms: 4, bathrooms: 3, builtArea: 280, currentValue: 3200000,
    }}),
    prisma.property.create({ data: {
      organizationId: org.id,
      name: "Bodega Centro Logístico Z12", type: "WAREHOUSE", status: "RENTED",
      addressLine: "16 Av 14-10 Nave 3", zone: "Zona 12", city: "Guatemala", department: "Guatemala",
      builtArea: 1200, currentValue: 4500000,
    }}),
    prisma.property.create({ data: {
      organizationId: org.id,
      name: "Apartamento Cayalá Studio", type: "APARTMENT", status: "AVAILABLE",
      addressLine: "Boulevard Cayala 8-15 Studio 4C", zone: "Zona 16", city: "Guatemala", department: "Guatemala",
      bedrooms: 1, bathrooms: 1, builtArea: 55, currentValue: 620000,
    }}),
    prisma.property.create({ data: {
      organizationId: org.id,
      name: "Oficina Premium Zona 15", type: "OFFICE", status: "RENTED",
      addressLine: "15 Av 20-33 Of. 8A", zone: "Zona 15", city: "Guatemala", department: "Guatemala",
      builtArea: 110, currentValue: 1100000,
    }}),
    prisma.property.create({ data: {
      organizationId: org.id,
      name: "Terreno Carretera al Pacifico", type: "LAND", status: "FOR_SALE",
      addressLine: "Km 85 Carretera CA-2 Lote 12", city: "Escuintla", department: "Escuintla",
      builtArea: 5000, currentValue: 800000,
    }}),
  ])
  const [pReforma, pMaestro, pMiraflores, pAntigua, pLogistico, pStudio, pZona15, pTerreno] = props

  console.log("► Cargando inquilinos y contratos…")

  // ── 12 TENANTS NUEVOS ─────────────────────────────────────────────────────
  const tenants = await Promise.all([
    prisma.tenant.create({ data: { organizationId: org.id, type: "INDIVIDUAL", fullName: "Carlos Eduardo Barrios Paz", documentType: "DPI", documentNumber: "3012847590101", email: "cebarrios@gmail.com", phone: "5544-8899" } }),
    prisma.tenant.create({ data: { organizationId: org.id, type: "INDIVIDUAL", fullName: "Lucia Esperanza Ramos", documentType: "DPI", documentNumber: "2876543190202", email: "lucia.ramos@hotmail.com", phone: "4433-7766" } }),
    prisma.tenant.create({ data: { organizationId: org.id, type: "COMPANY", fullName: "Distribuidora La Central SA", documentType: "NIT", documentNumber: "12876543-4", email: "gerencia@lacentral.gt", phone: "2288-4455" } }),
    prisma.tenant.create({ data: { organizationId: org.id, type: "INDIVIDUAL", fullName: "Jorge Alejandro Xicara", documentType: "DPI", documentNumber: "4123456780303", phone: "6655-4422" } }),
    prisma.tenant.create({ data: { organizationId: org.id, type: "INDIVIDUAL", fullName: "Sandra Patricia Morales Díaz", documentType: "DPI", documentNumber: "1987654320404", email: "sandy.morales@gmail.com", phone: "7744-3311" } }),
    prisma.tenant.create({ data: { organizationId: org.id, type: "COMPANY", fullName: "Servicios Corporativos GT SA", documentType: "NIT", documentNumber: "98765432-1", email: "admin@scgt.gt", phone: "2244-7788" } }),
    prisma.tenant.create({ data: { organizationId: org.id, type: "INDIVIDUAL", fullName: "Miguel Angel Cifuentes", documentType: "DPI", documentNumber: "2345678900505", email: "macifuentes@outlook.com", phone: "5566-3344" } }),
    prisma.tenant.create({ data: { organizationId: org.id, type: "INDIVIDUAL", fullName: "Gabriela Ximena Orantes", documentType: "DPI", documentNumber: "3456789010606", email: "gorantes@gmail.com", phone: "4477-2255" } }),
    prisma.tenant.create({ data: { organizationId: org.id, type: "COMPANY", fullName: "Tech Solutions Guatemala", documentType: "NIT", documentNumber: "87654321-0", email: "ops@techsol.gt", phone: "2255-8899" } }),
    prisma.tenant.create({ data: { organizationId: org.id, type: "INDIVIDUAL", fullName: "Fernando José Alvarado", documentType: "DPI", documentNumber: "5678901230707", phone: "6644-5533" } }),
    prisma.tenant.create({ data: { organizationId: org.id, type: "INDIVIDUAL", fullName: "Verónica del Carmen Pérez", documentType: "DPI", documentNumber: "6789012340808", email: "vperez@yahoo.com", phone: "7733-6644" } }),
    prisma.tenant.create({ data: { organizationId: org.id, type: "COMPANY", fullName: "Importadora Andina SA", documentType: "NIT", documentNumber: "76543210-9", email: "admin@andina.gt", phone: "2211-9988" } }),
  ])
  const [tBarrios, tLucia, tLaCentral, tXicara, tSandra, tScgt, tCifuentes, tGabriela, tTechSol, tFernando, tVeronica, tAndina] = tenants

  // ── 10 CONTRATOS NUEVOS ───────────────────────────────────────────────────
  const contracts = await Promise.all([
    // Activos normales
    prisma.contract.create({ data: {
      organizationId: org.id, contractNumber: "C-2024-005",
      propertyId: pReforma.id, tenantId: tBarrios.id,
      startDate: subMonths(now, 10), endDate: addMonths(now, 14),
      monthlyRent: 7200, paymentDueDay: 5, deposit: 14400, status: "ACTIVE",
    }}),
    prisma.contract.create({ data: {
      organizationId: org.id, contractNumber: "C-2024-006",
      propertyId: pMaestro.id, tenantId: tLucia.id,
      startDate: subMonths(now, 7), endDate: addMonths(now, 17),
      monthlyRent: 4800, paymentDueDay: 1, deposit: 9600, status: "ACTIVE",
    }}),
    prisma.contract.create({ data: {
      organizationId: org.id, contractNumber: "C-2024-007",
      propertyId: pMiraflores.id, tenantId: tLaCentral.id,
      startDate: subMonths(now, 5), endDate: addMonths(now, 19),
      monthlyRent: 6500, paymentDueDay: 10, deposit: 13000, status: "ACTIVE",
    }}),
    prisma.contract.create({ data: {
      organizationId: org.id, contractNumber: "C-2024-008",
      propertyId: pLogistico.id, tenantId: tAndina.id,
      startDate: subMonths(now, 14), endDate: addMonths(now, 10),
      monthlyRent: 22000, paymentDueDay: 1, deposit: 44000, status: "ACTIVE",
    }}),
    prisma.contract.create({ data: {
      organizationId: org.id, contractNumber: "C-2025-002",
      propertyId: pZona15.id, tenantId: tScgt.id,
      startDate: subMonths(now, 3), endDate: addMonths(now, 21),
      monthlyRent: 9500, paymentDueDay: 5, deposit: 19000, status: "ACTIVE",
    }}),
    // Por vencer pronto (< 30 días)
    prisma.contract.create({ data: {
      organizationId: org.id, contractNumber: "C-2023-003",
      propertyId: pMiraflores.id, tenantId: tSandra.id,
      startDate: subMonths(now, 24), endDate: addDays(now, 18),
      monthlyRent: 5800, paymentDueDay: 15, deposit: 11600, status: "ACTIVE",
    }}),
    // Por vencer en 45 días
    prisma.contract.create({ data: {
      organizationId: org.id, contractNumber: "C-2023-004",
      propertyId: pReforma.id, tenantId: tCifuentes.id,
      startDate: subMonths(now, 22), endDate: addDays(now, 45),
      monthlyRent: 6900, paymentDueDay: 5, deposit: 13800, status: "ACTIVE",
    }}),
    // Terminado
    prisma.contract.create({ data: {
      organizationId: org.id, contractNumber: "C-2022-001",
      propertyId: pStudio.id, tenantId: tFernando.id,
      startDate: subMonths(now, 36), endDate: subMonths(now, 12),
      monthlyRent: 3200, paymentDueDay: 1, deposit: 6400, status: "TERMINATED",
    }}),
    // Borrador
    prisma.contract.create({ data: {
      organizationId: org.id, contractNumber: "C-2025-003",
      propertyId: pAntigua.id, tenantId: tGabriela.id,
      startDate: addDays(now, 15), endDate: addMonths(now, 24),
      monthlyRent: 15000, paymentDueDay: 5, deposit: 30000, status: "DRAFT",
    }}),
    prisma.contract.create({ data: {
      organizationId: org.id, contractNumber: "C-2025-004",
      propertyId: pMaestro.id, tenantId: tXicara.id,
      startDate: subMonths(now, 1), endDate: addMonths(now, 23),
      monthlyRent: 5200, paymentDueDay: 10, deposit: 10400, status: "ACTIVE",
    }}),
  ])
  const [cReforma, cMaestro, cMiraflores, cLogistico, cZona15, cSandraVence, cCifuentesVence, cTerminado, cBorrador, cMaestro2] = contracts

  // ── PAGOS HISTÓRICOS para contratos activos ───────────────────────────────
  const contractPayments: Array<{id: string; rent: number; months: number}> = [
    { id: cReforma.id, rent: 7200, months: 10 },
    { id: cMaestro.id, rent: 4800, months: 7 },
    { id: cMiraflores.id, rent: 6500, months: 5 },
    { id: cLogistico.id, rent: 22000, months: 12 },
    { id: cZona15.id, rent: 9500, months: 3 },
    { id: cSandraVence.id, rent: 5800, months: 12 },
    { id: cCifuentesVence.id, rent: 6900, months: 10 },
    { id: cMaestro2.id, rent: 5200, months: 1 },
  ]
  for (const cp of contractPayments) {
    for (let i = cp.months - 1; i >= 0; i--) {
      const d = new Date(subMonths(now, i))
      d.setDate(5)
      await prisma.payment.create({ data: {
        organizationId: org.id, contractId: cp.id,
        amount: cp.rent, paymentDate: d,
        method: rand(["TRANSFER", "CASH", "CHECK"]),
        reference: `REF-${cp.id.slice(-4)}-${i}`,
      }})
    }
  }
  // Un contrato con un pago atrasado (solo 2 de 3 meses)
  for (let i = 2; i >= 1; i--) {
    const d = new Date(subMonths(now, i)); d.setDate(5)
    await prisma.payment.create({ data: {
      organizationId: org.id, contractId: cCifuentesVence.id,
      amount: 6900, paymentDate: d, method: "TRANSFER",
    }})
  }

  console.log("► Cargando vendors y facturas de proveedores…")

  // ── 6 VENDORS ADICIONALES ────────────────────────────────────────────────
  const [vFontaneria, vJardineria, vLimpieza, vCerrajero, vElectronica, vCivil] = await Promise.all([
    prisma.vendor.create({ data: { organizationId: org.id, name: "Fontanería Rápida GT", category: "PLUMBING", contactName: "Héctor Ruano", phone: "5512-3456", rating: 4.1, notes: "Responde en menos de 2 horas" } }),
    prisma.vendor.create({ data: { organizationId: org.id, name: "Jardines Eternos", category: "LANDSCAPING", contactName: "Pedro Ajú", phone: "6623-4567", rating: 4.4 } }),
    prisma.vendor.create({ data: { organizationId: org.id, name: "Limpieza Profesional GT", category: "CLEANING", contactName: "Rosa Chiquin", phone: "7734-5678", email: "info@limpiezagt.com", rating: 4.7 } }),
    prisma.vendor.create({ data: { organizationId: org.id, name: "Cerrajería Segura", category: "SECURITY", phone: "4445-6789", rating: 3.9 } }),
    prisma.vendor.create({ data: { organizationId: org.id, name: "Electrónica Industrial SA", category: "ELECTRICAL", contactName: "Ing. Roberto Chan", phone: "2256-7890", email: "rchan@electroind.gt", taxId: "45678901-2", rating: 4.6 } }),
    prisma.vendor.create({ data: { organizationId: org.id, name: "Constructora Civil del Sur", category: "CONSTRUCTION", contactName: "Ing. Arturo Mena", phone: "3367-8901", taxId: "56789012-3", rating: 4.3 } }),
  ])

  // Vendor existentes: get from DB
  const existingVendors = await prisma.vendor.findMany({ where: { organizationId: org.id } })
  const getV = (name: string) => existingVendors.find(v => v.name.includes(name))!

  // ── 12 FACTURAS PROVEEDOR (varias categorías y estados) ──────────────────
  const allProps = await prisma.property.findMany({ where: { organizationId: org.id } })
  const getP = (name: string) => allProps.find(p => p.name.includes(name))!

  await prisma.vendorInvoice.createMany({ data: [
    // Pagadas
    { organizationId: org.id, vendorId: vFontaneria.id, propertyId: getP("Zona 14").id,
      invoiceNumber: "FAC-FNT-001", date: subMonths(now, 3), dueDate: subMonths(now, 2),
      subtotal: 4500, taxAmount: 540, total: 5040, balance: 0, paidAmount: 5040, status: "PAID" },
    { organizationId: org.id, vendorId: vLimpieza.id, propertyId: getP("Cayala").id,
      invoiceNumber: "FAC-LMP-001", date: subMonths(now, 4), dueDate: subMonths(now, 3),
      subtotal: 2800, taxAmount: 336, total: 3136, balance: 0, paidAmount: 3136, status: "PAID" },
    { organizationId: org.id, vendorId: vCivil.id, propertyId: getP("Chalet").id,
      invoiceNumber: "FAC-CIV-001", date: subMonths(now, 6), dueDate: subMonths(now, 5),
      subtotal: 45000, taxAmount: 5400, total: 50400, balance: 0, paidAmount: 50400, status: "PAID" },
    // Pendientes normales
    { organizationId: org.id, vendorId: vJardineria.id, propertyId: getP("Monterrico").id,
      invoiceNumber: "FAC-JRD-001", date: subDays(now, 10), dueDate: addDays(now, 20),
      subtotal: 1800, taxAmount: 216, total: 2016, balance: 2016, status: "PENDING" },
    { organizationId: org.id, vendorId: vElectronica.id, propertyId: getP("Centro Logístico").id,
      invoiceNumber: "FAC-ELC-001", date: subDays(now, 5), dueDate: addDays(now, 25),
      subtotal: 28000, taxAmount: 3360, total: 31360, balance: 31360, status: "PENDING" },
    { organizationId: org.id, vendorId: vCivil.id, propertyId: getP("Casa Colonia").id,
      invoiceNumber: "FAC-CIV-002", date: subDays(now, 8), dueDate: addDays(now, 22),
      subtotal: 18500, taxAmount: 2220, total: 20720, balance: 20720, status: "PENDING" },
    { organizationId: org.id, vendorId: vFontaneria.id, propertyId: getP("Reforma").id,
      invoiceNumber: "FAC-FNT-002", date: subDays(now, 3), dueDate: addDays(now, 27),
      subtotal: 3200, taxAmount: 384, total: 3584, balance: 3584, status: "PENDING" },
    // Vencidas
    { organizationId: org.id, vendorId: vCerrajero.id, propertyId: getP("Oficina Zona 10").id,
      invoiceNumber: "FAC-CRJ-001", date: subMonths(now, 2), dueDate: subDays(now, 15),
      subtotal: 1200, taxAmount: 144, total: 1344, balance: 1344, status: "OVERDUE" },
    { organizationId: org.id, vendorId: vElectronica.id, propertyId: getP("Bodega Mixco").id,
      invoiceNumber: "FAC-ELC-002", date: subMonths(now, 2), dueDate: subDays(now, 10),
      subtotal: 15000, taxAmount: 1800, total: 16800, balance: 16800, status: "OVERDUE" },
    { organizationId: org.id, vendorId: vLimpieza.id, propertyId: getP("Zona 15").id,
      invoiceNumber: "FAC-LMP-002", date: subMonths(now, 3), dueDate: subDays(now, 30),
      subtotal: 3500, taxAmount: 420, total: 3920, balance: 3920, status: "OVERDUE" },
    // Parcialmente pagada
    { organizationId: org.id, vendorId: vCivil.id, propertyId: getP("Centro Logístico").id,
      invoiceNumber: "FAC-CIV-003", date: subMonths(now, 1), dueDate: addDays(now, 15),
      subtotal: 62000, taxAmount: 7440, total: 69440, balance: 34720, paidAmount: 34720, status: "PARTIAL" },
    { organizationId: org.id, vendorId: vElectronica.id, propertyId: getP("Antigua").id,
      invoiceNumber: "FAC-ELC-003", date: subDays(now, 20), dueDate: addDays(now, 10),
      subtotal: 40000, taxAmount: 4800, total: 44800, balance: 22400, paidAmount: 22400, status: "PARTIAL" },
  ]})

  console.log("► Cargando tickets de mantenimiento…")

  // ── 16 TICKETS ADICIONALES ───────────────────────────────────────────────
  const ticketData = [
    // COMPLETED
    { num: "T-007", prop: "Reforma", cat: "ELECTRICAL", pri: "HIGH", status: "COMPLETED",
      title: "Corto circuito en cocina", reported: daysAgo(30), completed: daysAgo(28),
      estimatedCost: 3500, actualCost: 3200, amountPaid: 3200, method: "TRANSFER",
      vendorName: "Electro Servicios GT" },
    { num: "T-008", prop: "Casa Colonia", cat: "PLUMBING", pri: "MEDIUM", status: "COMPLETED",
      title: "Fuga de agua en baño principal", reported: daysAgo(25), completed: daysAgo(22),
      estimatedCost: 1800, actualCost: 1650, amountPaid: 1650, method: "CAJA_CHICA",
      vendorName: "Fontanería Rápida GT" },
    { num: "T-009", prop: "Centro Logístico", cat: "STRUCTURAL", pri: "URGENT", status: "COMPLETED",
      title: "Grieta en pared de bodega norte", reported: daysAgo(45), completed: daysAgo(38),
      estimatedCost: 22000, actualCost: 19500, amountPaid: 19500, method: "TRANSFER",
      vendorName: "Constructora Civil del Sur" },
    { num: "T-010", prop: "Miraflores", cat: "APPLIANCE", pri: "LOW", status: "COMPLETED",
      title: "Refrigeradora no enfría", reported: daysAgo(15), completed: daysAgo(14),
      estimatedCost: 1200, actualCost: 950, amountPaid: 950, method: "CASH" },
    { num: "T-011", prop: "Zona 15", cat: "HVAC", pri: "MEDIUM", status: "COMPLETED",
      title: "Servicio preventivo A/C 4 equipos", reported: daysAgo(20), completed: daysAgo(17),
      estimatedCost: 2800, actualCost: 2800, amountPaid: 2800, method: "TRANSFER",
      vendorName: "Clima Total GT" },
    { num: "T-012", prop: "Cayala", cat: "LANDSCAPING", pri: "LOW", status: "COMPLETED",
      title: "Poda de árboles y jardín", reported: daysAgo(35), completed: daysAgo(34),
      estimatedCost: 2000, actualCost: 2000, amountPaid: 2000, method: "CASH",
      vendorName: "Jardines Eternos" },
    // IN_PROGRESS
    { num: "T-013", prop: "Reforma", cat: "PLUMBING", pri: "HIGH", status: "IN_PROGRESS",
      title: "Cambio de tubería de drenaje", reported: daysAgo(5),
      estimatedCost: 8500, vendorName: "Plomeros Unidos GT" },
    { num: "T-014", prop: "Centro Logístico", cat: "ELECTRICAL", pri: "URGENT", status: "IN_PROGRESS",
      title: "Instalación de planta de emergencia", reported: daysAgo(8),
      estimatedCost: 85000, vendorName: "Electrónica Industrial SA" },
    { num: "T-015", prop: "Chalet Antigua", cat: "STRUCTURAL", pri: "HIGH", status: "IN_PROGRESS",
      title: "Impermeabilización de techo completo", reported: daysAgo(12),
      estimatedCost: 35000, vendorName: "Constructora Civil del Sur" },
    { num: "T-016", prop: "Zona 15", cat: "PAINTING", pri: "LOW", status: "IN_PROGRESS",
      title: "Pintura de fachada exterior", reported: daysAgo(6),
      estimatedCost: 12000, vendorName: "Pintura Profesional" },
    // ASSIGNED
    { num: "T-017", prop: "Maestro", cat: "APPLIANCE", pri: "MEDIUM", status: "ASSIGNED",
      title: "Lavadora no centrifuga", reported: daysAgo(3),
      estimatedCost: 900 },
    { num: "T-018", prop: "Miraflores", cat: "SECURITY", pri: "HIGH", status: "ASSIGNED",
      title: "Sistema de alarma sin señal", reported: daysAgo(2),
      estimatedCost: 5500, vendorName: "Seguridad Integral" },
    // REPORTED
    { num: "T-019", prop: "Antigua", cat: "PLUMBING", pri: "MEDIUM", status: "REPORTED",
      title: "Goteo en techo de terraza", reported: daysAgo(1), estimatedCost: 6000 },
    { num: "T-020", prop: "Logístico", cat: "ELECTRICAL", pri: "LOW", status: "REPORTED",
      title: "Luminaria quemada en área de carga", reported: daysAgo(1), estimatedCost: 350 },
    { num: "T-021", prop: "Reforma", cat: "CLEANING", pri: "LOW", status: "REPORTED",
      title: "Limpieza de cisterna y tanque elevado", reported: daysAgo(0), estimatedCost: 3500 },
    { num: "T-022", prop: "Studio", cat: "SECURITY", pri: "URGENT", status: "REPORTED",
      title: "Cerradura de puerta principal dañada", reported: daysAgo(0), estimatedCost: 1800 },
  ]

  for (const td of ticketData) {
    const prop = allProps.find(p => p.name.includes(td.prop))!
    const vendor = td.vendorName ? existingVendors.find(v => v.name.includes(td.vendorName!.split(" ")[0])) ?? null : null

    const ticket = await prisma.maintenanceRequest.create({ data: {
      organizationId: org.id,
      ticketNumber: td.num,
      propertyId: prop.id,
      vendorId: vendor?.id ?? null,
      category: td.cat,
      priority: td.pri,
      status: td.status,
      title: td.title,
      description: td.title,
      estimatedCost: td.estimatedCost,
      actualCost: (td as any).actualCost ?? null,
      amountPaid: (td as any).amountPaid ?? 0,
      totalAmount: (td as any).actualCost ?? td.estimatedCost,
      reportedAt: td.reported,
      assignedToId: td.status !== "REPORTED" ? rand([admin.id, supervisor.id, asst1.id]) : null,
      assignedAt: td.status !== "REPORTED" ? daysAgo(Math.max(1, randInt(1, 4))) : null,
      startedAt: ["IN_PROGRESS", "COMPLETED"].includes(td.status) ? daysAgo(randInt(1, 5)) : null,
      completedAt: td.status === "COMPLETED" ? (td as any).completed ?? daysAgo(1) : null,
      paymentMode: (td as any).method ? "VENDOR" : null,
    }})

    if ((td as any).amountPaid && (td as any).method) {
      await prisma.ticketPayment.create({ data: {
        ticketId: ticket.id,
        amount: (td as any).amountPaid,
        method: (td as any).method,
        date: (td as any).completed ?? daysAgo(1),
        reference: `PAY-${td.num}`,
      }})
    }

    await prisma.maintenanceTimelineEvent.create({ data: {
      ticketId: ticket.id, type: "STATUS_CHANGE",
      message: `Ticket creado — ${td.title}`,
      createdAt: td.reported,
    }})
    if (td.status !== "REPORTED") {
      await prisma.maintenanceTimelineEvent.create({ data: {
        ticketId: ticket.id, type: "ASSIGNMENT",
        message: "Asignado a técnico",
        createdAt: daysAgo(randInt(1, 3)),
      }})
    }
    if (td.status === "COMPLETED") {
      await prisma.maintenanceTimelineEvent.create({ data: {
        ticketId: ticket.id, type: "STATUS_CHANGE",
        message: "Ticket completado",
        createdAt: (td as any).completed ?? daysAgo(1),
      }})
    }
  }

  console.log("► Cargando proyectos y partidas…")

  // ── 4 PROYECTOS ADICIONALES ──────────────────────────────────────────────
  const [projRemoLogistica, projRestauracion, projSolarReforma, projAmpliacion] = await Promise.all([
    prisma.project.create({ data: {
      organizationId: org.id, propertyId: getP("Centro Logístico").id,
      name: "Remodelación Bodega Logística", type: "RENOVATION",
      status: "IN_PROGRESS", budgetEstimate: 350000, progressPercent: 35,
      startDate: subMonths(now, 4), endDate: addMonths(now, 5),
    }}),
    prisma.project.create({ data: {
      organizationId: org.id, propertyId: getP("Chalet").id,
      name: "Restauración Chalet Antigua", type: "MAINTENANCE",
      status: "IN_PROGRESS", budgetEstimate: 180000, progressPercent: 20,
      startDate: subMonths(now, 2), endDate: addMonths(now, 8),
    }}),
    prisma.project.create({ data: {
      organizationId: org.id, propertyId: getP("Torre Reforma").id,
      name: "Paneles Solares Torre Reforma", type: "CONSTRUCTION",
      status: "PLANNING", budgetEstimate: 95000, progressPercent: 0,
      startDate: addMonths(now, 1), endDate: addMonths(now, 6),
    }}),
    prisma.project.create({ data: {
      organizationId: org.id, propertyId: getP("Casa Colonia").id,
      name: "Ampliación 2do Nivel Casa Maestro", type: "CONSTRUCTION",
      status: "COMPLETED", budgetEstimate: 220000, progressPercent: 100,
      startDate: subMonths(now, 14), endDate: subMonths(now, 4),
    }}),
  ])

  // Partidas para projRemoLogistica
  const partidasLogistica = await Promise.all([
    prisma.projectPartida.create({ data: { projectId: projRemoLogistica.id, name: "Demolición y limpieza", budgetEstimate: 45000, amountApproved: 42000, amountPaid: 42000, vendorId: vCivil.id, status: "PAID", orderIndex: 0, deliveredAt: subMonths(now, 2) } }),
    prisma.projectPartida.create({ data: { projectId: projRemoLogistica.id, name: "Estructura metálica nueva", budgetEstimate: 120000, amountApproved: 115000, amountPaid: 57500, vendorId: vCivil.id, status: "IN_PROGRESS", orderIndex: 1 } }),
    prisma.projectPartida.create({ data: { projectId: projRemoLogistica.id, name: "Instalación eléctrica industrial", budgetEstimate: 85000, amountApproved: 82000, amountPaid: 41000, vendorId: vElectronica.id, status: "IN_PROGRESS", orderIndex: 2 } }),
    prisma.projectPartida.create({ data: { projectId: projRemoLogistica.id, name: "Piso epóxico", budgetEstimate: 60000, amountApproved: 0, amountPaid: 0, status: "QUOTING", orderIndex: 3 } }),
    prisma.projectPartida.create({ data: { projectId: projRemoLogistica.id, name: "Pintura y señalización", budgetEstimate: 40000, status: "PENDING", orderIndex: 4 } }),
  ])

  // Pagos para partidas de logística
  await prisma.partidaPayment.create({ data: {
    partidaId: partidasLogistica[0].id, amount: 42000, type: "FINAL",
    date: subMonths(now, 2), method: "TRANSFER", reference: "TRF-LOG-001",
    percentageOfTotal: 100, notes: "Pago total tras entrega",
  }})
  await prisma.partidaPayment.create({ data: {
    partidaId: partidasLogistica[1].id, amount: 57500, type: "ADVANCE",
    date: subMonths(now, 1), method: "TRANSFER", reference: "TRF-LOG-002",
    percentageOfTotal: 50, notes: "Anticipo 50% para materiales",
  }})
  await prisma.partidaPayment.create({ data: {
    partidaId: partidasLogistica[2].id, amount: 41000, type: "ADVANCE",
    date: subMonths(now, 1), method: "TRANSFER", reference: "TRF-LOG-003",
    percentageOfTotal: 50, notes: "Anticipo instalación eléctrica",
  }})

  // Partidas para projRestauracion
  const partidasRestauracion = await Promise.all([
    prisma.projectPartida.create({ data: { projectId: projRestauracion.id, name: "Impermeabilización techo", budgetEstimate: 38000, amountApproved: 35000, amountPaid: 17500, vendorId: vCivil.id, status: "IN_PROGRESS", orderIndex: 0 } }),
    prisma.projectPartida.create({ data: { projectId: projRestauracion.id, name: "Restauración ventanas coloniales", budgetEstimate: 55000, status: "PENDING", orderIndex: 1 } }),
    prisma.projectPartida.create({ data: { projectId: projRestauracion.id, name: "Pintura exterior fachada", budgetEstimate: 28000, amountApproved: 26000, amountPaid: 13000, status: "IN_PROGRESS", orderIndex: 2 } }),
  ])
  await prisma.partidaPayment.create({ data: {
    partidaId: partidasRestauracion[0].id, amount: 17500, type: "ADVANCE",
    date: subMonths(now, 1), method: "TRANSFER", reference: "TRF-ANT-001",
    percentageOfTotal: 50,
  }})
  await prisma.partidaPayment.create({ data: {
    partidaId: partidasRestauracion[2].id, amount: 13000, type: "ADVANCE",
    date: subWeeks(now, 2), method: "TRANSFER", reference: "TRF-ANT-002",
    percentageOfTotal: 50,
  }})

  // Partidas para projAmpliacion (completado)
  const partidasAmpliacion = await Promise.all([
    prisma.projectPartida.create({ data: { projectId: projAmpliacion.id, name: "Cimentación 2do nivel", budgetEstimate: 55000, amountApproved: 52000, amountPaid: 52000, vendorId: vCivil.id, status: "PAID", orderIndex: 0, deliveredAt: subMonths(now, 6) } }),
    prisma.projectPartida.create({ data: { projectId: projAmpliacion.id, name: "Levantado de paredes", budgetEstimate: 65000, amountApproved: 63000, amountPaid: 63000, vendorId: vCivil.id, status: "PAID", orderIndex: 1, deliveredAt: subMonths(now, 5) } }),
    prisma.projectPartida.create({ data: { projectId: projAmpliacion.id, name: "Instalación eléctrica", budgetEstimate: 40000, amountApproved: 38000, amountPaid: 38000, vendorId: vElectronica.id, status: "PAID", orderIndex: 2, deliveredAt: subMonths(now, 4) } }),
    prisma.projectPartida.create({ data: { projectId: projAmpliacion.id, name: "Acabados interiores", budgetEstimate: 60000, amountApproved: 57000, amountPaid: 57000, vendorId: vCivil.id, status: "PAID", orderIndex: 3, deliveredAt: subMonths(now, 4) } }),
  ])
  for (const [i, p] of partidasAmpliacion.entries()) {
    const dates = [subMonths(now, 8), subMonths(now, 7), subMonths(now, 6), subMonths(now, 5)]
    await prisma.partidaPayment.create({ data: {
      partidaId: p.id, amount: p.amountApproved!, type: "FINAL",
      date: dates[i], method: "TRANSFER", reference: `TRF-AMP-00${i+1}`,
      percentageOfTotal: 100,
    }})
  }

  console.log("► Cargando cajas chicas…")

  // ── 3 CAJAS CHICAS ADICIONALES ────────────────────────────────────────────
  const propsCajaChica = [getP("Torre Reforma"), getP("Centro Logístico"), getP("Casa Colonia")]
  const cajasExtra = await Promise.all(propsCajaChica.map(p =>
    prisma.pettyCash.create({ data: {
      organizationId: org.id, propertyId: p.id,
      balance: randAmount(800, 3500), maxBalance: 5000,
    }})
  ))

  for (const caja of cajasExtra) {
    // 8-12 movimientos por caja
    let running = caja.maxBalance
    await prisma.pettyCashMovement.create({ data: {
      pettyCashId: caja.id, type: "REPLENISHMENT", amount: caja.maxBalance,
      description: "Apertura caja chica", date: subMonths(now, 3),
      reference: "APERTURA",
    }})
    const expenseItems = [
      { amount: 350, desc: "Limpieza mensual", cat: "CLEANING" },
      { amount: 180, desc: "Materiales de limpieza", cat: "CLEANING" },
      { amount: 620, desc: "Reparación menor plomería", cat: "MAINTENANCE" },
      { amount: 450, desc: "Cambio de foco LED x8", cat: "MAINTENANCE" },
      { amount: 290, desc: "Pintura de retoque", cat: "MAINTENANCE" },
      { amount: 180, desc: "Jardín — abono y herbicida", cat: "OTHER" },
      { amount: 500, desc: "Servicio de fumigación", cat: "CLEANING" },
      { amount: 320, desc: "Sellado de grieta piso", cat: "MAINTENANCE" },
      { amount: 150, desc: "Repuesto para cerradura", cat: "OTHER" },
      { amount: 420, desc: "Mantenimiento bomba de agua", cat: "MAINTENANCE" },
    ]
    let dOffset = 80
    for (const item of expenseItems) {
      running -= item.amount
      dOffset -= 8
      if (running < 0) running = 0
      await prisma.pettyCashMovement.create({ data: {
        pettyCashId: caja.id, type: "EXPENSE", amount: item.amount,
        description: item.desc, date: daysAgo(dOffset),
        category: item.cat,
      }})
    }
    // Reposición a mitad
    const repAmount = caja.maxBalance - running
    if (repAmount > 500) {
      running += repAmount
      await prisma.pettyCashMovement.create({ data: {
        pettyCashId: caja.id, type: "REPLENISHMENT", amount: repAmount,
        description: "Reposición ordinaria", date: daysAgo(35),
        reference: "REPOS-MID",
      }})
    }
    // Más gastos recientes
    const recentExpenses = [
      { amount: 280, desc: "Gas propano cocina", cat: "OTHER" },
      { amount: 190, desc: "Reemplazo filtro agua", cat: "MAINTENANCE" },
      { amount: 450, desc: "Materiales eléctricos", cat: "MAINTENANCE" },
    ]
    for (const [i, item] of recentExpenses.entries()) {
      running -= item.amount
      if (running < 0) running = 0
      await prisma.pettyCashMovement.create({ data: {
        pettyCashId: caja.id, type: "EXPENSE", amount: item.amount,
        description: item.desc, date: daysAgo(i * 7 + 3),
        category: item.cat,
      }})
    }
    await prisma.pettyCash.update({ where: { id: caja.id }, data: { balance: Math.max(running, 0) } })
  }

  console.log("► Cargando cotizaciones adicionales…")

  // ── COTIZACIONES para nuevos proyectos ────────────────────────────────────
  await Promise.all([
    prisma.quote.create({ data: {
      organizationId: org.id, vendorId: vCivil.id, projectId: projRestauracion.id,
      quoteNumber: "COT-2025-007", date: subDays(now, 18),
      validUntil: addDays(now, 12), subtotal: 24000, taxAmount: 2880, total: 26880,
      status: "APPROVED", approvedAt: subDays(now, 15), approvedBy: admin.name,
      notes: "Restauración ventanas coloniales — precio incluye materiales",
    }}),
    prisma.quote.create({ data: {
      organizationId: org.id, vendorId: getV("Pintura Profesional").id, projectId: projRestauracion.id,
      quoteNumber: "COT-2025-008", date: subDays(now, 14),
      validUntil: addDays(now, 16), subtotal: 23000, taxAmount: 2760, total: 25760,
      status: "PENDING",
    }}),
    prisma.quote.create({ data: {
      organizationId: org.id, vendorId: vElectronica.id, projectId: projSolarReforma.id,
      quoteNumber: "COT-2025-009", date: subDays(now, 7),
      validUntil: addDays(now, 23), subtotal: 82000, taxAmount: 9840, total: 91840,
      status: "PENDING", notes: "20 paneles 400W + inversor trifásico + instalación",
    }}),
    prisma.quote.create({ data: {
      organizationId: org.id, vendorId: getV("Clima Total").id, projectId: projSolarReforma.id,
      quoteNumber: "COT-2025-010", date: subDays(now, 5),
      validUntil: addDays(now, 25), subtotal: 79000, taxAmount: 9480, total: 88480,
      status: "PENDING",
    }}),
  ])

  console.log("► Cargando solicitudes de aprobación…")

  // ── 15 APPROVAL REQUESTS adicionales ─────────────────────────────────────
  const newVendorInvoices = await prisma.vendorInvoice.findMany({
    where: { organizationId: org.id, status: { in: ["PENDING", "OVERDUE"] } },
    take: 5,
  })
  const newTickets = await prisma.maintenanceRequest.findMany({
    where: { organizationId: org.id, status: "IN_PROGRESS" },
    take: 4,
  })
  const newPartidas = await prisma.projectPartida.findMany({
    where: { project: { organizationId: org.id }, status: "IN_PROGRESS" },
    take: 3,
  })

  // Aprobaciones de facturas (mix pendiente / aprobado / rechazado)
  for (const [i, vi] of newVendorInvoices.entries()) {
    const statuses = ["PENDING", "PENDING", "APPROVED", "REJECTED", "PENDING"] as const
    const st = statuses[i]
    await prisma.approvalRequest.create({ data: {
      organizationId: org.id,
      entityType: "VENDOR_INVOICE", entityId: vi.id,
      title: `Autorizar factura ${vi.invoiceNumber}`,
      amount: vi.total,
      requestedById: rand([manager.id, supervisor.id, asst1.id]),
      approvedById: st === "APPROVED" ? admin.id : null,
      rejectedById: st === "REJECTED" ? admin.id : null,
      status: st,
      approvedAt: st === "APPROVED" ? daysAgo(randInt(1, 5)) : null,
      rejectedAt: st === "REJECTED" ? daysAgo(randInt(1, 3)) : null,
      rejectionReason: st === "REJECTED" ? "Factura no corresponde al servicio aprobado" : null,
      notes: `Factura de proveedor por servicio realizado`,
    }})
  }

  // Aprobaciones de tickets (pago de servicio)
  for (const [i, tk] of newTickets.entries()) {
    await prisma.approvalRequest.create({ data: {
      organizationId: org.id,
      entityType: "TICKET", entityId: tk.id,
      title: `Aprobar pago: ${tk.title}`,
      amount: tk.estimatedCost,
      requestedById: rand([supervisor.id, asst1.id]),
      status: i === 0 ? "APPROVED" : "PENDING",
      approvedById: i === 0 ? admin.id : null,
      approvedAt: i === 0 ? daysAgo(2) : null,
      notes: "Solicitud de autorización de pago a proveedor",
    }})
  }

  // Aprobaciones de partidas
  for (const p of newPartidas) {
    await prisma.approvalRequest.create({ data: {
      organizationId: org.id,
      entityType: "PROJECT_PARTIDA", entityId: p.id,
      title: `Desembolso partida: ${p.name}`,
      amount: (p.amountApproved ?? 0) / 2,
      requestedById: manager.id,
      cosignerId: admin.id,
      status: "PENDING_COSIGN",
      notes: "Segundo desembolso — requiere co-firma",
    }})
  }

  // Caja chica reposiciones pendientes
  const cajasAll = await prisma.pettyCash.findMany({ where: { organizationId: org.id }, take: 3 })
  for (const caja of cajasAll.slice(0, 2)) {
    await prisma.approvalRequest.create({ data: {
      organizationId: org.id,
      entityType: "PETTY_CASH", entityId: caja.id,
      title: `Reposición caja chica`,
      amount: caja.maxBalance * 0.6,
      requestedById: asst1.id,
      status: "PENDING",
      notes: "Balance bajo — solicitud de reposición ordinaria",
    }})
  }

  // Aprobaciones antiguas (historial)
  const oldTickets = await prisma.maintenanceRequest.findMany({
    where: { organizationId: org.id, status: "COMPLETED" },
    take: 4,
  })
  for (const tk of oldTickets) {
    await prisma.approvalRequest.create({ data: {
      organizationId: org.id,
      entityType: "TICKET", entityId: tk.id,
      title: `Pago aprobado: ${tk.title}`,
      amount: tk.actualCost,
      requestedById: rand([supervisor.id, asst1.id]),
      approvedById: admin.id,
      status: "APPROVED",
      approvedAt: daysAgo(randInt(5, 30)),
    }})
  }

  console.log("► Cargando empleados…")

  // ── 7 EMPLEADOS ADICIONALES ──────────────────────────────────────────────
  await prisma.employee.createMany({ data: [
    { organizationId: org.id, fullName: "Silvia Beatriz Cux", documentNumber: "1122334450201", position: "Recepcionista", phone: "5544-2211", hireDate: subMonths(now, 36), payPeriod: "MONTHLY", payRate: 4200 },
    { organizationId: org.id, fullName: "Ernesto Amilcar Tzul", documentNumber: "2233445560202", position: "Vigilante nocturno", phone: "6655-3322", hireDate: subMonths(now, 48), payPeriod: "MONTHLY", payRate: 3800 },
    { organizationId: org.id, fullName: "Patricia Lorena Vásquez", documentNumber: "3344556670303", position: "Contadora", phone: "7766-4433", email: "patri.vasquez@empresa.gt", hireDate: subMonths(now, 24), payPeriod: "MONTHLY", payRate: 9500 },
    { organizationId: org.id, fullName: "Óscar René Canel", documentNumber: "4455667780404", position: "Jardinero", phone: "8877-5544", hireDate: subMonths(now, 60), payPeriod: "MONTHLY", payRate: 3200 },
    { organizationId: org.id, fullName: "Miriam Esperanza Xol", documentNumber: "5566778890505", position: "Asistente administrativa", phone: "9988-6655", hireDate: subMonths(now, 15), payPeriod: "MONTHLY", payRate: 5000 },
    { organizationId: org.id, fullName: "Carlos Humberto Alvarado", documentNumber: "6677889900606", position: "Técnico eléctrico", phone: "1122-7766", hireDate: subMonths(now, 30), payPeriod: "BIWEEKLY", payRate: 4500 },
    { organizationId: org.id, fullName: "Jennifer Marisol López", documentNumber: "7788990010707", position: "Gestora de arriendos", phone: "2233-8877", email: "jlopez@empresa.gt", hireDate: subMonths(now, 8), payPeriod: "MONTHLY", payRate: 7500 },
  ]})

  console.log("► Cargando notificaciones…")

  // ── NOTIFICACIONES adicionales ────────────────────────────────────────────
  await prisma.notification.createMany({ data: [
    { organizationId: org.id, userId: admin.id, type: "CONTRACT_EXPIRING", title: "Contrato por vencer — 18 días", message: "Contrato de Sandra Morales en Local Miraflores vence en 18 días", isRead: false },
    { organizationId: org.id, userId: admin.id, type: "CONTRACT_EXPIRING", title: "Contrato por vencer — 45 días", message: "Contrato de M.A. Cifuentes en Torre Reforma vence en 45 días", isRead: false },
    { organizationId: org.id, userId: manager.id, type: "APPROVAL_PENDING", title: "3 solicitudes pendientes de tu aprobación", message: "Revisa las solicitudes en el módulo de Autorizaciones", link: "/autorizaciones", isRead: false },
    { organizationId: org.id, userId: supervisor.id, type: "APPROVAL_PENDING", title: "Co-firma requerida", message: "Desembolso de partida requiere tu co-firma", link: "/autorizaciones", isRead: false },
    { organizationId: org.id, userId: admin.id, type: "INVOICE_OVERDUE", title: "Factura vencida — Cerrajería Segura", message: "FAC-CRJ-001 vencida hace 15 días — Q1,344.00", isRead: false },
    { organizationId: org.id, userId: admin.id, type: "INVOICE_OVERDUE", title: "Factura vencida — Electrónica Industrial", message: "FAC-ELC-002 vencida hace 10 días — Q16,800.00", isRead: false },
    { organizationId: org.id, userId: admin.id, type: "MAINTENANCE_URGENT", title: "Ticket urgente nuevo", message: "T-022: Cerradura de puerta principal dañada — Apt Cayalá Studio", link: "/mantenimiento", isRead: false },
    { organizationId: org.id, userId: asst1.id, type: "MAINTENANCE_URGENT", title: "Ticket asignado a ti", message: "T-017: Lavadora no centrifuga — Casa Colonia El Maestro", isRead: false },
  ]})

  console.log("")
  console.log("✓ seed-rich completado")
  console.log(`  +8 propiedades, +12 inquilinos, +10 contratos`)
  console.log(`  +6 proveedores, +12 facturas proveedor`)
  console.log(`  +16 tickets (5 completados, 4 en progreso, 2 asignados, 5 reportados)`)
  console.log(`  +4 proyectos, +12 partidas con pagos ricos`)
  console.log(`  +3 cajas chicas con 10-13 movimientos c/u`)
  console.log(`  +4 cotizaciones, +15 solicitudes autorización`)
  console.log(`  +7 empleados, +8 notificaciones`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
