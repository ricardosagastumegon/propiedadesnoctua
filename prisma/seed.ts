import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { subMonths, addMonths, addDays, subDays } from "date-fns"

const prisma = new PrismaClient()

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "demo" },
    update: {},
    create: { name: "Propiedades Demo GT", slug: "demo", type: "FAMILY", taxId: "CF" },
  })

  const hash = await bcrypt.hash("demo1234", 10)

  // ─── USERS ──────────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.gt" },
    update: {},
    create: { email: "admin@demo.gt", name: "Carlos Mendez", passwordHash: hash, role: "ADMIN", authorityPolicy: "ALONE", organizationId: org.id },
  })

  const manager = await prisma.user.upsert({
    where: { email: "gerente@demo.gt" },
    update: {},
    create: { email: "gerente@demo.gt", name: "Sofia Giron", passwordHash: hash, role: "MANAGER", authorityPolicy: "COSIGN_REQUIRED", organizationId: org.id },
  })

  const supervisor = await prisma.user.upsert({
    where: { email: "super@demo.gt" },
    update: {},
    create: { email: "super@demo.gt", name: "Luis Herrera", passwordHash: hash, role: "SUPERVISOR", authorityPolicy: "COSIGN_REQUIRED", organizationId: org.id },
  })

  const assistant1 = await prisma.user.upsert({
    where: { email: "asist1@demo.gt" },
    update: {},
    create: { email: "asist1@demo.gt", name: "Maria Torres", passwordHash: hash, role: "ASSISTANT", authorityPolicy: "NONE", organizationId: org.id },
  })

  const assistant2 = await prisma.user.upsert({
    where: { email: "asist2@demo.gt" },
    update: {},
    create: { email: "asist2@demo.gt", name: "Pedro Vasquez", passwordHash: hash, role: "ASSISTANT", authorityPolicy: "NONE", organizationId: org.id },
  })

  const viewer = await prisma.user.upsert({
    where: { email: "demo@inmobiliaria.gt" },
    update: {},
    create: { email: "demo@inmobiliaria.gt", name: "Ana Morales", passwordHash: hash, role: "VIEWER", authorityPolicy: "NONE", organizationId: org.id },
  })

  // ─── COSIGN POLICIES ────────────────────────────────────────────────────────
  // Manager needs admin to co-sign
  await prisma.cosignPolicy.upsert({
    where: { userId: manager.id },
    update: { allowedCosigners: { set: [{ id: admin.id }] } },
    create: { userId: manager.id, allowedCosigners: { connect: [{ id: admin.id }] } },
  })
  // Supervisor needs manager or admin to co-sign
  await prisma.cosignPolicy.upsert({
    where: { userId: supervisor.id },
    update: { allowedCosigners: { set: [{ id: admin.id }, { id: manager.id }] } },
    create: { userId: supervisor.id, allowedCosigners: { connect: [{ id: admin.id }, { id: manager.id }] } },
  })

  // ─── CLEAN ──────────────────────────────────────────────────────────────────
  await prisma.notification.deleteMany({ where: { organizationId: org.id } })
  await prisma.approvalRequest.deleteMany({ where: { organizationId: org.id } })
  await prisma.assetRecord.deleteMany({ where: { asset: { organizationId: org.id } } })
  await prisma.assetServiceLog.deleteMany({ where: { asset: { organizationId: org.id } } })
  await prisma.asset.deleteMany({ where: { organizationId: org.id } })
  await prisma.assetRecordType.deleteMany({ where: { organizationId: org.id } })
  await prisma.vendorInvoice.deleteMany({ where: { organizationId: org.id } })
  await prisma.partidaPayment.deleteMany({ where: { partida: { project: { organizationId: org.id } } } })
  await prisma.projectPartida.deleteMany({ where: { project: { organizationId: org.id } } })
  await prisma.quoteItem.deleteMany({ where: { quote: { organizationId: org.id } } })
  await prisma.quote.deleteMany({ where: { organizationId: org.id } })
  await prisma.vendor.deleteMany({ where: { organizationId: org.id } })
  await prisma.projectTask.deleteMany({ where: { project: { organizationId: org.id } } })
  await prisma.projectCost.deleteMany({ where: { project: { organizationId: org.id } } })
  await prisma.project.deleteMany({ where: { organizationId: org.id } })
  await prisma.maintenanceRequest.deleteMany({ where: { organizationId: org.id } })
  await prisma.expense.deleteMany({ where: { organizationId: org.id } })
  await prisma.invoiceItem.deleteMany({ where: { invoice: { organizationId: org.id } } })
  await prisma.payment.deleteMany({ where: { organizationId: org.id } })
  await prisma.invoice.deleteMany({ where: { organizationId: org.id } })
  await prisma.contract.deleteMany({ where: { organizationId: org.id } })
  await prisma.property.deleteMany({ where: { organizationId: org.id } })
  await prisma.tenant.deleteMany({ where: { organizationId: org.id } })
  await prisma.employee.deleteMany({ where: { organizationId: org.id } })

  const now = new Date()

  // ─── PROPERTIES ─────────────────────────────────────────────────────────────
  const propCayala = await prisma.property.create({ data: {
    organizationId: org.id,
    name: "Casa Cayala", type: "HOUSE", status: "RENTED",
    addressLine: "Boulevard Cayala 12-34", zone: "Zona 16", city: "Guatemala", department: "Guatemala",
    bedrooms: 4, bathrooms: 3.5, builtArea: 320, currentValue: 2800000,
  }})

  const propMonterrico = await prisma.property.create({ data: {
    organizationId: org.id,
    name: "Cabana Monterrico", type: "VACATION", status: "AVAILABLE",
    addressLine: "Calle del Mar km 105", city: "Monterrico", department: "Santa Rosa",
    bedrooms: 3, bathrooms: 2, builtArea: 180, currentValue: 1500000,
  }})

  const propZ14 = await prisma.property.create({ data: {
    organizationId: org.id,
    name: "Apartamento Zona 14", type: "APARTMENT", status: "RENTED",
    addressLine: "Av. La Reforma 14-55 apto 8B", zone: "Zona 14", city: "Guatemala", department: "Guatemala",
    bedrooms: 2, bathrooms: 2, builtArea: 120, currentValue: 1200000,
  }})

  const propOficina = await prisma.property.create({ data: {
    organizationId: org.id,
    name: "Oficina Zona 10", type: "COMMERCIAL", status: "RENTED",
    addressLine: "10 Calle 1-65 Of. 302", zone: "Zona 10", city: "Guatemala", department: "Guatemala",
    builtArea: 85, currentValue: 900000,
  }})

  const propBodega = await prisma.property.create({ data: {
    organizationId: org.id,
    name: "Bodega Mixco", type: "WAREHOUSE", status: "AVAILABLE",
    addressLine: "Calzada Roosevelt 25-80", city: "Mixco", department: "Guatemala",
    builtArea: 600, currentValue: 1800000,
  }})

  // ─── TENANTS ────────────────────────────────────────────────────────────────
  const t1 = await prisma.tenant.create({ data: {
    organizationId: org.id, type: "INDIVIDUAL", fullName: "Ana Lopez Martinez",
    documentType: "DPI", documentNumber: "2485637890101",
    email: "ana.lopez@gmail.com", phone: "5588-7766",
  }})

  const t2 = await prisma.tenant.create({ data: {
    organizationId: org.id, type: "INDIVIDUAL", fullName: "Roberto Castillo Juarez",
    documentType: "DPI", documentNumber: "1924538790201",
    email: "rcastillo@outlook.com", phone: "4477-3355",
  }})

  const t3 = await prisma.tenant.create({ data: {
    organizationId: org.id, type: "COMPANY", fullName: "Soluciones TI Guatemala S.A.",
    documentType: "NIT", documentNumber: "78654321-7",
    email: "admin@solucionesti.gt", phone: "2366-5544",
  }})

  const t4 = await prisma.tenant.create({ data: {
    organizationId: org.id, type: "INDIVIDUAL", fullName: "Maria Fernanda Solis",
    documentType: "DPI", documentNumber: "3075849260303",
    phone: "3344-2211",
  }})

  // ─── CONTRACTS ──────────────────────────────────────────────────────────────
  const c1 = await prisma.contract.create({ data: {
    organizationId: org.id,
    contractNumber: "C-2024-001",
    propertyId: propCayala.id, tenantId: t1.id,
    startDate: subMonths(now, 18), endDate: addDays(now, 45), // Expires in 45 days
    monthlyRent: 8500, paymentDueDay: 5, deposit: 17000,
    status: "ACTIVE",
  }})

  const c2 = await prisma.contract.create({ data: {
    organizationId: org.id,
    contractNumber: "C-2024-002",
    propertyId: propZ14.id, tenantId: t2.id,
    startDate: subMonths(now, 12), endDate: addMonths(now, 14),
    monthlyRent: 5500, paymentDueDay: 1, deposit: 11000,
    status: "ACTIVE",
  }})

  const c3 = await prisma.contract.create({ data: {
    organizationId: org.id,
    contractNumber: "C-2024-003",
    propertyId: propOficina.id, tenantId: t3.id,
    startDate: subMonths(now, 8), endDate: addMonths(now, 16),
    monthlyRent: 12000, paymentDueDay: 10, deposit: 24000,
    status: "ACTIVE",
  }})

  const c4 = await prisma.contract.create({ data: {
    organizationId: org.id,
    contractNumber: "C-2025-001",
    propertyId: propBodega.id, tenantId: t4.id,
    startDate: subMonths(now, 2), endDate: addDays(now, 20), // Expires in 20 days
    monthlyRent: 9000, paymentDueDay: 15, deposit: 18000,
    status: "ACTIVE",
  }})

  // ─── PAYMENTS ───────────────────────────────────────────────────────────────
  async function addPayments(contractId: string, monthlyRent: number, months: number) {
    for (let i = months - 1; i >= 0; i--) {
      const d = subMonths(now, i)
      d.setDate(5)
      await prisma.payment.create({ data: {
        organizationId: org.id, contractId,
        amount: monthlyRent, paymentDate: d,
        method: "TRANSFER", reference: `TRF-${Date.now()}-${i}`,
      }})
    }
  }

  await addPayments(c1.id, 8500, 6)
  await addPayments(c2.id, 5500, 5)
  await addPayments(c3.id, 12000, 4)
  await addPayments(c4.id, 9000, 2)

  // ─── INVOICES ───────────────────────────────────────────────────────────────
  const inv1 = await prisma.invoice.create({ data: {
    organizationId: org.id, contractId: c1.id,
    number: "F-2025-001",
    issueDate: subMonths(now, 1), dueDate: addDays(subMonths(now, 1), 30),
    subtotal: 8500, taxAmount: 0, total: 8500, balance: 0, paidAmount: 8500,
    status: "PAID",
  }})

  await prisma.invoice.create({ data: {
    organizationId: org.id, contractId: c2.id,
    number: "F-2025-002",
    issueDate: now, dueDate: addDays(now, 15),
    subtotal: 5500, taxAmount: 0, total: 5500, balance: 5500,
    status: "ISSUED",
    isModified: true, modificationType: "DISCOUNT",
    modificationAmount: 275, modificationReason: "Descuento por pago anticipado",
  }})

  await prisma.invoice.create({ data: {
    organizationId: org.id, contractId: c3.id,
    number: "F-2025-003",
    issueDate: subMonths(now, 2), dueDate: subDays(now, 15),
    subtotal: 12000, taxAmount: 0, total: 12000, balance: 12000,
    status: "OVERDUE",
  }})

  // ─── EXPENSES ───────────────────────────────────────────────────────────────
  await prisma.expense.createMany({ data: [
    { organizationId: org.id, propertyId: propCayala.id, category: "MAINTENANCE", amount: 3500, date: subMonths(now, 2), description: "Reparacion plomeria cocina" },
    { organizationId: org.id, propertyId: propMonterrico.id, category: "CLEANING", amount: 1800, date: subMonths(now, 1), description: "Limpieza profunda playa" },
    { organizationId: org.id, propertyId: propZ14.id, category: "INSURANCE", amount: 4500, date: subMonths(now, 3), description: "Poliza anual propiedad" },
    { organizationId: org.id, propertyId: propOficina.id, category: "UTILITIES", amount: 2200, date: subMonths(now, 1), description: "Electricidad octubre" },
    { organizationId: org.id, category: "ADMINISTRATIVE", amount: 1500, date: subMonths(now, 1), description: "Honorarios legales" },
    { organizationId: org.id, propertyId: propBodega.id, category: "MAINTENANCE", amount: 5000, date: subMonths(now, 4), description: "Pintura exterior bodega" },
  ]})

  // ─── MAINTENANCE TICKETS ─────────────────────────────────────────────────────
  await prisma.maintenanceRequest.createMany({ data: [
    { organizationId: org.id, ticketNumber: "T-001", propertyId: propCayala.id, category: "PLUMBING", priority: "HIGH", status: "IN_PROGRESS", title: "Fuga en tuberia de jardin", description: "Se reporto fuga de agua en area de jardin trasero", reportedBy: "Ana Lopez", reportedAt: subDays(now, 5), assignedToId: supervisor.id },
    { organizationId: org.id, ticketNumber: "T-002", propertyId: propMonterrico.id, category: "ELECTRICAL", priority: "URGENT", status: "REPORTED", title: "Cortocircuito en sala", description: "Breaker principal salta repetidamente", reportedBy: "Encargado", reportedAt: subDays(now, 2) },
    { organizationId: org.id, ticketNumber: "T-003", propertyId: propZ14.id, category: "HVAC", priority: "MEDIUM", status: "ASSIGNED", title: "A/C no enfria", description: "Unidad de A/C pierde eficiencia", assignedToId: assistant1.id, assignedAt: subDays(now, 3), reportedAt: subDays(now, 7) },
    { organizationId: org.id, ticketNumber: "T-004", propertyId: propOficina.id, category: "SECURITY", priority: "LOW", status: "REPORTED", title: "Camara de seguridad sin imagen", description: "Camara exterior del parqueo no transmite", reportedAt: subDays(now, 10) },
    { organizationId: org.id, ticketNumber: "T-005", propertyId: propCayala.id, category: "GENERAL", priority: "MEDIUM", status: "COMPLETED", title: "Puerta de garage atascada", description: "Motor de puerta automatica falla", reportedAt: subDays(now, 20), completedAt: subDays(now, 15) },
  ]})

  // ─── VENDORS ────────────────────────────────────────────────────────────────
  const v1 = await prisma.vendor.create({ data: {
    organizationId: org.id, name: "Plomeros Unidos GT", category: "PLUMBING",
    contactName: "Jose Pilar", phone: "5544-3322", rating: 4.5,
  }})

  const v2 = await prisma.vendor.create({ data: {
    organizationId: org.id, name: "Electro Servicios GT", category: "ELECTRICAL",
    contactName: "Miguel Angel Ruiz", phone: "4433-2211", email: "info@electroserv.gt", rating: 4.8,
  }})

  const v3 = await prisma.vendor.create({ data: {
    organizationId: org.id, name: "Constructora Vega SA", category: "CONSTRUCTION",
    taxId: "12345678-9", contactName: "Ing. Roberto Vega", phone: "2345-6789", rating: 4.2,
  }})

  const v4 = await prisma.vendor.create({ data: {
    organizationId: org.id, name: "Clima Total GT", category: "HVAC",
    phone: "6677-8899", email: "ventas@climatotal.gt", rating: 4.6,
  }})

  const v5 = await prisma.vendor.create({ data: {
    organizationId: org.id, name: "Pintura Profesional", category: "PAINTING",
    contactName: "Juan Mateo", phone: "3322-4455",
  }})

  const v6 = await prisma.vendor.create({ data: {
    organizationId: org.id, name: "Seguridad Integral", category: "SECURITY",
    phone: "7788-9900", isActive: true,
  }})

  // ─── QUOTES ─────────────────────────────────────────────────────────────────
  const q1 = await prisma.quote.create({ data: {
    organizationId: org.id, vendorId: v3.id, propertyId: propMonterrico.id,
    quoteNumber: "COT-2025-001", date: subDays(now, 15),
    validUntil: addDays(now, 15), subtotal: 45000, taxAmount: 5400, total: 50400,
    status: "PENDING",
  }})
  await prisma.quoteItem.createMany({ data: [
    { quoteId: q1.id, description: "Remodelacion de terraza", quantity: 1, unitPrice: 30000, total: 30000 },
    { quoteId: q1.id, description: "Impermeabilizacion de techo", quantity: 1, unitPrice: 15000, total: 15000 },
  ]})

  const q2 = await prisma.quote.create({ data: {
    organizationId: org.id, vendorId: v4.id,
    quoteNumber: "COT-2025-002", date: subDays(now, 20),
    subtotal: 18000, taxAmount: 2160, total: 20160,
    status: "APPROVED", approvedAt: subDays(now, 5), approvedBy: admin.name,
  }})
  await prisma.quoteItem.createMany({ data: [
    { quoteId: q2.id, description: "Instalacion A/C split 24000 BTU", quantity: 2, unitPrice: 8500, total: 17000 },
    { quoteId: q2.id, description: "Instalacion", quantity: 1, unitPrice: 1000, total: 1000 },
  ]})

  const q3 = await prisma.quote.create({ data: {
    organizationId: org.id, vendorId: v5.id, propertyId: propBodega.id,
    quoteNumber: "COT-2025-003", date: subDays(now, 5),
    validUntil: addDays(now, 25), subtotal: 22000, taxAmount: 2640, total: 24640,
    status: "PENDING",
  }})
  await prisma.quoteItem.createMany({ data: [
    { quoteId: q3.id, description: "Pintura exterior m2 (600 m2)", quantity: 600, unit: "m2", unitPrice: 35, total: 21000 },
    { quoteId: q3.id, description: "Pintura interior m2 (50 m2)", quantity: 50, unit: "m2", unitPrice: 20, total: 1000 },
  ]})

  // ─── VENDOR INVOICES ────────────────────────────────────────────────────────
  await prisma.vendorInvoice.createMany({ data: [
    {
      organizationId: org.id, vendorId: v4.id,
      invoiceNumber: "FAC-V-001", date: subDays(now, 10),
      dueDate: addDays(now, 20), subtotal: 18000, taxAmount: 2160, total: 20160,
      balance: 20160, status: "APPROVED",
    },
    {
      organizationId: org.id, vendorId: v3.id, propertyId: propMonterrico.id,
      invoiceNumber: "FAC-V-002", date: subDays(now, 30),
      dueDate: subDays(now, 5), subtotal: 8000, taxAmount: 960, total: 8960,
      balance: 0, paidAmount: 8960, status: "PAID", paidAt: subDays(now, 6),
    },
    {
      organizationId: org.id, vendorId: v1.id, propertyId: propCayala.id,
      invoiceNumber: "FAC-V-003", date: subDays(now, 5),
      dueDate: addDays(now, 25), subtotal: 3500, taxAmount: 420, total: 3920,
      balance: 3920, status: "PENDING",
    },
  ]})

  // ─── ASSETS ─────────────────────────────────────────────────────────────────
  const assetLancha1 = await prisma.asset.create({ data: {
    organizationId: org.id, propertyId: propMonterrico.id,
    category: "VEHICLE", name: "Lancha Monterrico A",
    brand: "Yamaha", model: "AR210", serialNumber: "YM-2019-0045",
    purchaseDate: new Date("2019-06-15"), purchaseCost: 185000, currentValue: 130000,
    status: "ACTIVE", location: "Muelle privado Monterrico",
  }})

  const assetLancha2 = await prisma.asset.create({ data: {
    organizationId: org.id, propertyId: propMonterrico.id,
    category: "VEHICLE", name: "Lancha Monterrico B",
    brand: "Sea-Doo", model: "Challenger 180", serialNumber: "SD-2021-1122",
    purchaseDate: new Date("2021-03-10"), purchaseCost: 220000, currentValue: 185000,
    status: "ACTIVE", location: "Muelle privado Monterrico",
  }})

  const assetJetski = await prisma.asset.create({ data: {
    organizationId: org.id, propertyId: propMonterrico.id,
    category: "VEHICLE", name: "Jet Ski Monterrico",
    brand: "Kawasaki", model: "Ultra 310X", serialNumber: "KW-310-2020",
    purchaseDate: new Date("2020-08-01"), purchaseCost: 95000, currentValue: 75000,
    status: "ACTIVE", location: "Muelle privado Monterrico",
  }})

  const assetAC1 = await prisma.asset.create({ data: {
    organizationId: org.id, propertyId: propCayala.id,
    category: "HVAC", name: "A/C Sala Principal Cayala",
    brand: "LG", model: "LS-Q242HSG2", serialNumber: "LG2022-AC-001",
    purchaseDate: new Date("2022-01-15"), purchaseCost: 12500, currentValue: 9000,
    status: "ACTIVE", location: "Sala principal",
  }})

  const assetAC2 = await prisma.asset.create({ data: {
    organizationId: org.id, propertyId: propZ14.id,
    category: "HVAC", name: "A/C Recamara Master Z14",
    brand: "Samsung", model: "AR18TSHQBU", serialNumber: "SAM-AC-2023-88",
    purchaseDate: new Date("2023-05-20"), purchaseCost: 8900, currentValue: 7500,
    status: "ACTIVE",
  }})

  // ─── SERVICE LOGS ────────────────────────────────────────────────────────────
  await prisma.assetServiceLog.createMany({ data: [
    { assetId: assetLancha1.id, serviceType: "Mantenimiento anual", date: subMonths(now, 6), cost: 4500, performedBy: "Taller Naval GT", nextServiceAt: addMonths(now, 6) },
    { assetId: assetLancha2.id, serviceType: "Revision de motor", date: subMonths(now, 2), cost: 2800, nextServiceAt: addDays(now, 12) },
    { assetId: assetJetski.id, serviceType: "Cambio de aceite", date: subMonths(now, 4), cost: 1200, performedBy: "Kawasaki GT", nextServiceAt: addDays(now, 25) },
    { assetId: assetAC1.id, serviceType: "Limpieza y recarga", date: subMonths(now, 3), cost: 850, nextServiceAt: addMonths(now, 3) },
  ]})

  // ─── ASSET RECORD TYPES ──────────────────────────────────────────────────────
  const rtypes = await Promise.all([
    prisma.assetRecordType.create({ data: { organizationId: org.id, code: "INSURANCE", name: "Seguro", isSystem: true } }),
    prisma.assetRecordType.create({ data: { organizationId: org.id, code: "REGISTRATION", name: "Matricula / Registro", isSystem: true } }),
    prisma.assetRecordType.create({ data: { organizationId: org.id, code: "LICENSE", name: "Licencia", isSystem: true } }),
    prisma.assetRecordType.create({ data: { organizationId: org.id, code: "INSPECTION", name: "Inspeccion tecnica", isSystem: true } }),
    prisma.assetRecordType.create({ data: { organizationId: org.id, code: "WARRANTY", name: "Garantia", isSystem: true } }),
    prisma.assetRecordType.create({ data: { organizationId: org.id, code: "PERMIT", name: "Permiso de operacion", isSystem: true } }),
  ])
  const [rtInsurance, rtRegistration, rtLicense, rtInspection, rtWarranty] = rtypes

  // ─── ASSET RECORDS ───────────────────────────────────────────────────────────
  // Lancha 1 - Insurance expiring in 5 days (URGENT)
  await prisma.assetRecord.create({ data: {
    assetId: assetLancha1.id, recordTypeId: rtInsurance.id,
    title: "Poliza Seguro 2024", issueDate: subMonths(now, 11),
    expiryDate: addDays(now, 5), notifyDaysBefore: 30,
    notes: "Seguro maritimo Aseguradoras GT",
  }})
  // Lancha 1 - Registration expiring in 15 days
  await prisma.assetRecord.create({ data: {
    assetId: assetLancha1.id, recordTypeId: rtRegistration.id,
    title: "Matricula Lancha 2025", issueDate: subMonths(now, 10),
    expiryDate: addDays(now, 15), notifyDaysBefore: 30,
  }})
  // Lancha 2 - Valid insurance
  await prisma.assetRecord.create({ data: {
    assetId: assetLancha2.id, recordTypeId: rtInsurance.id,
    title: "Poliza Seguro Lancha B", issueDate: subMonths(now, 2),
    expiryDate: addMonths(now, 10), notifyDaysBefore: 30,
  }})
  // Jet Ski - Expired registration
  await prisma.assetRecord.create({ data: {
    assetId: assetJetski.id, recordTypeId: rtRegistration.id,
    title: "Matricula Jet Ski 2024", issueDate: subMonths(now, 13),
    expiryDate: subDays(now, 10), notifyDaysBefore: 30,
    notes: "VENCIDA - pendiente renovacion",
  }})
  // Jet Ski - License expiring in 8 days
  await prisma.assetRecord.create({ data: {
    assetId: assetJetski.id, recordTypeId: rtLicense.id,
    title: "Licencia nautica 2025", issueDate: subMonths(now, 11),
    expiryDate: addDays(now, 8), notifyDaysBefore: 30,
  }})
  // AC warranty (valid)
  await prisma.assetRecord.create({ data: {
    assetId: assetAC1.id, recordTypeId: rtWarranty.id,
    title: "Garantia fabrica LG", issueDate: new Date("2022-01-15"),
    expiryDate: new Date("2027-01-15"), notifyDaysBefore: 60,
  }})

  // ─── PROJECTS ────────────────────────────────────────────────────────────────
  const proj1 = await prisma.project.create({ data: {
    organizationId: org.id, propertyId: propMonterrico.id,
    type: "RENOVATION", name: "Remodelacion Terraza Monterrico",
    description: "Ampliacion y remodelacion de terraza exterior con vista al mar",
    status: "IN_PROGRESS", budgetEstimate: 120000,
    startDate: subMonths(now, 2), endDate: addMonths(now, 2),
    progressPercent: 35,
  }})

  const proj2 = await prisma.project.create({ data: {
    organizationId: org.id, propertyId: propCayala.id,
    type: "ELECTRICAL", name: "Instalacion Paneles Solares Cayala",
    description: "Sistema fotovoltaico 10kW para reduccion de consumo electrico",
    status: "PLANNING", budgetEstimate: 85000,
    startDate: addMonths(now, 1), endDate: addMonths(now, 4),
    progressPercent: 0,
  }})

  const proj3 = await prisma.project.create({ data: {
    organizationId: org.id, propertyId: propBodega.id,
    type: "PAINTING", name: "Pintura y mantenimiento Bodega Mixco",
    status: "PLANNING", budgetEstimate: 28000,
    startDate: addDays(now, 15), endDate: addMonths(now, 1),
    progressPercent: 0,
  }})

  // ─── PROJECT TASKS ───────────────────────────────────────────────────────────
  await prisma.projectTask.createMany({ data: [
    { projectId: proj1.id, name: "Diseño arquitectonico", status: "DONE", orderIndex: 0, completedAt: subMonths(now, 1) },
    { projectId: proj1.id, name: "Demolicion terraza vieja", status: "DONE", orderIndex: 1, completedAt: subDays(now, 20) },
    { projectId: proj1.id, name: "Cimentacion nueva", status: "IN_PROGRESS", orderIndex: 2 },
    { projectId: proj1.id, name: "Acabados y pintura", status: "TODO", orderIndex: 3 },
    { projectId: proj2.id, name: "Evaluacion tecnica y cotizaciones", status: "TODO", orderIndex: 0 },
    { projectId: proj2.id, name: "Tramite de permiso municipal", status: "TODO", orderIndex: 1 },
    { projectId: proj2.id, name: "Instalacion de paneles", status: "TODO", orderIndex: 2 },
    { projectId: proj3.id, name: "Preparacion de superficies", status: "TODO", orderIndex: 0 },
    { projectId: proj3.id, name: "Aplicacion de pintura", status: "TODO", orderIndex: 1 },
  ]})

  // ─── PROJECT PARTIDAS ────────────────────────────────────────────────────────
  const partida1 = await prisma.projectPartida.create({ data: {
    projectId: proj1.id, name: "Demolicion y preparacion",
    budgetEstimate: 25000, status: "COMPLETED", amountApproved: 22000, amountPaid: 22000, orderIndex: 0,
  }})
  await prisma.partidaPayment.create({ data: {
    partidaId: partida1.id, amount: 22000, date: subDays(now, 18),
    method: "TRANSFER", reference: "TRF-PROJ-001",
  }})

  const partida2 = await prisma.projectPartida.create({ data: {
    projectId: proj1.id, name: "Cimentacion y estructura",
    budgetEstimate: 45000, status: "IN_PROGRESS", vendorId: v3.id,
    amountApproved: 42000, amountPaid: 21000, orderIndex: 1,
  }})
  await prisma.partidaPayment.create({ data: {
    partidaId: partida2.id, amount: 21000, date: subDays(now, 5),
    method: "TRANSFER", reference: "TRF-PROJ-002",
    notes: "Primer desembolso 50%",
  }})

  const partida3 = await prisma.projectPartida.create({ data: {
    projectId: proj1.id, name: "Acabados y decoracion",
    budgetEstimate: 50000, status: "QUOTING", orderIndex: 2,
  }})

  const partida4 = await prisma.projectPartida.create({ data: {
    projectId: proj2.id, name: "Paneles solares y onduladores",
    budgetEstimate: 65000, status: "PENDING", orderIndex: 0,
  }})

  const partida5 = await prisma.projectPartida.create({ data: {
    projectId: proj2.id, name: "Instalacion electrica",
    budgetEstimate: 20000, status: "PENDING", orderIndex: 1,
  }})

  // Partidas for Bodega Mixco (proj3) — rich example with quotes
  const partida6 = await prisma.projectPartida.create({ data: {
    projectId: proj3.id, name: "Pintura exterior bodega",
    budgetEstimate: 24000, status: "QUOTING", orderIndex: 0,
  }})

  const partida7 = await prisma.projectPartida.create({ data: {
    projectId: proj3.id, name: "Camas metalicas y estanterias",
    budgetEstimate: 12000, orderIndex: 1,
    // Will be approved with Mobitec quote below
  }})

  // Link existing quote to partida6
  await prisma.quote.update({ where: { id: q1.id }, data: { partidaId: partida3.id } })
  await prisma.quote.update({ where: { id: q3.id }, data: { partidaId: partida6.id } })

  // 2 more quotes for partida6 (pintura)
  const v7 = await prisma.vendor.create({ data: {
    organizationId: org.id, name: "Pinturas del Sur", category: "PAINTING",
    contactName: "Ernesto Ramos", phone: "5511-2233", rating: 3.8,
  }})
  const q4 = await prisma.quote.create({ data: {
    organizationId: org.id, vendorId: v7.id, projectId: proj3.id, partidaId: partida6.id,
    quoteNumber: "COT-2025-004", date: subDays(now, 3),
    validUntil: addDays(now, 27), subtotal: 19000, taxAmount: 2280, total: 21280,
    status: "PENDING",
  }})
  await prisma.quoteItem.createMany({ data: [
    { quoteId: q4.id, description: "Pintura exterior 600m2 (latex premium)", quantity: 600, unit: "m2", unitPrice: 28, total: 16800 },
    { quoteId: q4.id, description: "Preparacion de superficie", quantity: 600, unit: "m2", unitPrice: 3.67, total: 2200 },
  ]})

  // 2 quotes for partida7 (camas Mobitec — approved)
  const v8 = await prisma.vendor.create({ data: {
    organizationId: org.id, name: "Mobitec Guatemala", category: "OTHER",
    contactName: "Claudia Fuentes", phone: "6644-7788", email: "ventas@mobitec.gt", rating: 4.7,
  }})
  const v9 = await prisma.vendor.create({ data: {
    organizationId: org.id, name: "Metalica Industrial SA", category: "CONSTRUCTION",
    phone: "7733-4455", rating: 4.0,
  }})

  const qMobitec = await prisma.quote.create({ data: {
    organizationId: org.id, vendorId: v8.id, projectId: proj3.id, partidaId: partida7.id,
    quoteNumber: "COT-2025-005", date: subDays(now, 10),
    validUntil: addDays(now, 20), subtotal: 8000, taxAmount: 960, total: 8960,
    status: "APPROVED", approvedAt: subDays(now, 3), approvedBy: admin.name,
    notes: "Incluye instalacion y garantia 1 año",
  }})
  await prisma.quoteItem.createMany({ data: [
    { quoteId: qMobitec.id, description: "Camas metalicas industriales 2x1.5m", quantity: 10, unitPrice: 650, total: 6500 },
    { quoteId: qMobitec.id, description: "Instalacion y anclaje", quantity: 1, unitPrice: 1500, total: 1500 },
  ]})

  const qMetalica = await prisma.quote.create({ data: {
    organizationId: org.id, vendorId: v9.id, projectId: proj3.id, partidaId: partida7.id,
    quoteNumber: "COT-2025-006", date: subDays(now, 8),
    validUntil: addDays(now, 22), subtotal: 11000, taxAmount: 1320, total: 12320,
    status: "PENDING",
  }})
  await prisma.quoteItem.createMany({ data: [
    { quoteId: qMetalica.id, description: "Estanterias metalicas 2.5m alto", quantity: 8, unitPrice: 1200, total: 9600 },
    { quoteId: qMetalica.id, description: "Instalacion", quantity: 1, unitPrice: 1400, total: 1400 },
  ]})

  // Approve partida7 with Mobitec quote + Q8000 anticipo payment
  await prisma.projectPartida.update({
    where: { id: partida7.id },
    data: { approvedQuoteId: qMobitec.id, vendorId: v8.id, amountApproved: 8960, status: "IN_PROGRESS" },
  })
  const anticipo = await prisma.partidaPayment.create({ data: {
    partidaId: partida7.id, amount: 8000, type: "ADVANCE", date: subDays(now, 2),
    method: "TRANSFER", reference: "TRF-MOBITEC-001", notes: "Anticipo 89%",
  }})
  await prisma.projectPartida.update({ where: { id: partida7.id }, data: { amountPaid: 8000 } })

  // ─── EMPLOYEES ────────────────────────────────────────────────────────────────
  await prisma.employee.createMany({ data: [
    { organizationId: org.id, fullName: "Marcos Tzul", documentNumber: "1234567890101", position: "Conserje", phone: "5544-1122", hireDate: subMonths(now, 24), payPeriod: "MONTHLY", payRate: 3500 },
    { organizationId: org.id, fullName: "Beatriz Coy", documentNumber: "9876543210102", position: "Administrativa", phone: "6655-3344", hireDate: subMonths(now, 18), payPeriod: "MONTHLY", payRate: 5500 },
    { organizationId: org.id, fullName: "Diego Morales", documentNumber: "5566778890103", position: "Tecnico de mantenimiento", phone: "7766-5544", hireDate: subMonths(now, 12), payPeriod: "BIWEEKLY", payRate: 2800 },
  ]})

  // ─── APPROVAL REQUESTS ───────────────────────────────────────────────────────
  // 1. Quote pending approval (manager submitted, needs admin approval)
  await prisma.approvalRequest.create({ data: {
    organizationId: org.id, entityType: "QUOTE", entityId: q1.id,
    requestedById: manager.id, status: "PENDING",
    notes: "Cotizacion para remodelacion terraza - favor revisar",
  }})

  // 2. Quote pending cosign (supervisor submitted, needs cosign)
  await prisma.approvalRequest.create({ data: {
    organizationId: org.id, entityType: "QUOTE", entityId: q3.id,
    requestedById: supervisor.id, cosignerId: manager.id, status: "PENDING_COSIGN",
    notes: "Cotizacion pintura bodega - requiere co-firma",
  }})

  // 3. Contract modification pending
  await prisma.approvalRequest.create({ data: {
    organizationId: org.id, entityType: "CONTRACT", entityId: c4.id,
    requestedById: manager.id, status: "PENDING",
    notes: "Renovacion anticipada de contrato bodega",
  }})

  // 4. Vendor invoice pending approval
  const vi = await prisma.vendorInvoice.findFirst({ where: { organizationId: org.id, status: "PENDING" } })
  if (vi) {
    await prisma.approvalRequest.create({ data: {
      organizationId: org.id, entityType: "VENDOR_INVOICE", entityId: vi.id,
      requestedById: assistant1.id, status: "PENDING",
      notes: "Factura plomeros por reparacion urgente",
    }})
  }

  // 5. Approved request (historical)
  await prisma.approvalRequest.create({ data: {
    organizationId: org.id, entityType: "QUOTE", entityId: q2.id,
    requestedById: manager.id, approvedById: admin.id,
    status: "APPROVED", approvedAt: subDays(now, 5),
    notes: "Cotizacion A/C aprovada",
  }})

  // 6. Partida approval (cotizacion de acabados pendiente)
  await prisma.approvalRequest.create({ data: {
    organizationId: org.id, entityType: "PROJECT_PARTIDA", entityId: partida3.id,
    relatedId: q1.id,
    requestedById: supervisor.id, status: "PENDING_COSIGN",
    title: `Aprobar cotizacion: Constructora Vega SA — Remodelacion Terraza`,
    amount: q1.total,
    notes: "Partida de acabados: Constructora Vega SA Q50,400",
  }})

  // 7. Mobitec approval (approved, historical)
  await prisma.approvalRequest.create({ data: {
    organizationId: org.id, entityType: "PROJECT_PARTIDA", entityId: partida7.id,
    relatedId: qMobitec.id,
    requestedById: manager.id, approvedById: admin.id,
    status: "APPROVED", approvedAt: subDays(now, 3),
    title: "Aprobar cotizacion: Mobitec Guatemala — Bodega Mixco",
    amount: qMobitec.total,
    notes: "Camas metalicas e instalacion",
  }})

  // ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
  await prisma.notification.createMany({ data: [
    { organizationId: org.id, userId: admin.id, type: "CONTRACT_EXPIRING", title: "Contrato por vencer", message: "Contrato de Ana Lopez en Casa Cayala vence en 45 dias", link: `/contratos/${c1.id}`, isRead: false },
    { organizationId: org.id, userId: admin.id, type: "CONTRACT_EXPIRING", title: "Contrato critico", message: "Contrato de Maria Fernanda en Bodega Mixco vence en 20 dias", link: `/contratos/${c4.id}`, isRead: false },
    { organizationId: org.id, userId: admin.id, type: "ASSET_RECORD_EXPIRING", title: "Seguro por vencer", message: "Lancha Monterrico A: Poliza Seguro 2024 vence en 5 dias", link: `/activos/${assetLancha1.id}`, isRead: false },
    { organizationId: org.id, userId: admin.id, type: "ASSET_RECORD_EXPIRED", title: "Matricula vencida", message: "Jet Ski Monterrico: Matricula vencio hace 10 dias", link: `/activos/${assetJetski.id}`, isRead: false },
    { organizationId: org.id, userId: admin.id, type: "INVOICE_OVERDUE", title: "Factura vencida", message: "Factura F-2025-003 de Soluciones TI esta vencida", link: `/contratos/${c3.id}`, isRead: true },
  ]})

  console.log("Seed v2 completado exitosamente.")
  console.log(`Org: ${org.id}`)
  console.log(`Admin: admin@demo.gt / demo1234`)
  console.log(`Manager: gerente@demo.gt / demo1234`)
  console.log(`Supervisor: super@demo.gt / demo1234`)
  console.log(`Viewer: demo@inmobiliaria.gt / demo1234`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
