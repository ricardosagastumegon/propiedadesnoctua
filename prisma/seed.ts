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
  // Juan Mendez (owner-style admin) — approves but cannot accept services
  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.gt" },
    update: { authorityPolicy: "ALONE", role: "ADMIN", canAcceptServices: false, name: "Juan Mendez" },
    create: { email: "admin@demo.gt", name: "Juan Mendez", passwordHash: hash, role: "ADMIN", authorityPolicy: "ALONE", canAcceptServices: false, organizationId: org.id },
  })

  // Sofia Giron (manager) — CAN accept services
  const manager = await prisma.user.upsert({
    where: { email: "gerente@demo.gt" },
    update: { authorityPolicy: "COSIGN_REQUIRED", role: "MANAGER", canAcceptServices: true },
    create: { email: "gerente@demo.gt", name: "Sofia Giron", passwordHash: hash, role: "MANAGER", authorityPolicy: "COSIGN_REQUIRED", canAcceptServices: true, organizationId: org.id },
  })

  // Luis Herrera (supervisor) — no accept
  const supervisor = await prisma.user.upsert({
    where: { email: "super@demo.gt" },
    update: { authorityPolicy: "COSIGN_REQUIRED", role: "SUPERVISOR", canAcceptServices: false },
    create: { email: "super@demo.gt", name: "Luis Herrera", passwordHash: hash, role: "SUPERVISOR", authorityPolicy: "COSIGN_REQUIRED", canAcceptServices: false, organizationId: org.id },
  })

  // Maria Gonzalez (admin-level accept) — CAN accept services. Originally Maria Torres.
  const assistant1 = await prisma.user.upsert({
    where: { email: "asist1@demo.gt" },
    update: { authorityPolicy: "NONE", role: "ADMIN", canAcceptServices: true, name: "Maria Gonzalez" },
    create: { email: "asist1@demo.gt", name: "Maria Gonzalez", passwordHash: hash, role: "ADMIN", authorityPolicy: "NONE", canAcceptServices: true, organizationId: org.id },
  })

  // Pedro Vasquez (assistant) — no accept; he is the one who solicits acceptances
  const assistant2 = await prisma.user.upsert({
    where: { email: "asist2@demo.gt" },
    update: { authorityPolicy: "NONE", role: "ASSISTANT", canAcceptServices: false },
    create: { email: "asist2@demo.gt", name: "Pedro Vasquez", passwordHash: hash, role: "ASSISTANT", authorityPolicy: "NONE", canAcceptServices: false, organizationId: org.id },
  })

  // Ana Morales (viewer) — no accept
  const viewer = await prisma.user.upsert({
    where: { email: "demo@inmobiliaria.gt" },
    update: { authorityPolicy: "NONE", role: "VIEWER", canAcceptServices: false },
    create: { email: "demo@inmobiliaria.gt", name: "Ana Morales", passwordHash: hash, role: "VIEWER", authorityPolicy: "NONE", canAcceptServices: false, organizationId: org.id },
  })

  // Roberto Castillo (extra assistant) — no accept
  const roberto = await prisma.user.upsert({
    where: { email: "roberto@demo.gt" },
    update: { authorityPolicy: "NONE", role: "ASSISTANT", canAcceptServices: false },
    create: { email: "roberto@demo.gt", name: "Roberto Castillo", passwordHash: hash, role: "ASSISTANT", authorityPolicy: "NONE", canAcceptServices: false, organizationId: org.id },
  })

  // OrganizationSettings — default 80% cap
  await prisma.organizationSettings.upsert({
    where: { organizationId: org.id },
    update: { prepaymentCapPercentage: 80 },
    create: { organizationId: org.id, prepaymentCapPercentage: 80 },
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
  await prisma.serviceAcceptancePhoto.deleteMany({ where: { acceptance: { organizationId: org.id } } })
  await prisma.serviceAcceptance.deleteMany({ where: { organizationId: org.id } })
  await prisma.activityLog.deleteMany({ where: { organizationId: org.id } })
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
  await prisma.projectTask.deleteMany({ where: { project: { organizationId: org.id } } })
  await prisma.projectCost.deleteMany({ where: { project: { organizationId: org.id } } })
  await prisma.project.deleteMany({ where: { organizationId: org.id } })
  await prisma.maintenanceRequest.deleteMany({ where: { organizationId: org.id } })
  await prisma.vendor.deleteMany({ where: { organizationId: org.id } })
  await prisma.pettyCash.deleteMany({ where: { organizationId: org.id } })
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

  // ─── PETTY CASH ──────────────────────────────────────────────────────────────
  async function seedPettyCash(propertyId: string, initialBalance: number, maxBalance: number, movements: Array<{ type: string; amount: number; description: string; category?: string; daysAgo: number }>) {
    const pc = await prisma.pettyCash.create({ data: { organizationId: org.id, propertyId, balance: initialBalance, maxBalance } })
    for (const m of movements) {
      await prisma.pettyCashMovement.create({ data: {
        pettyCashId: pc.id, type: m.type, amount: m.amount,
        description: m.description, category: m.category, date: subDays(now, m.daysAgo),
      }})
    }
    return pc
  }

  await seedPettyCash(propCayala.id, 1450, 3000, [
    { type: "REPLENISHMENT", amount: 3000, description: "Reposicion inicial caja chica", daysAgo: 60 },
    { type: "EXPENSE", amount: 350, description: "Materiales limpieza mensual", category: "Limpieza", daysAgo: 45 },
    { type: "EXPENSE", amount: 280, description: "Focos LED repuesto", category: "Electricidad", daysAgo: 30 },
    { type: "EXPENSE", amount: 520, description: "Pintura y brochas area jardin", category: "Materiales", daysAgo: 20 },
    { type: "EXPENSE", amount: 400, description: "Motor puerta garage", category: "Varios", daysAgo: 15 },
  ])

  await seedPettyCash(propMonterrico.id, 3200, 5000, [
    { type: "REPLENISHMENT", amount: 5000, description: "Fondos temporada alta", daysAgo: 90 },
    { type: "EXPENSE", amount: 800, description: "Limpieza playa y terraza", category: "Limpieza", daysAgo: 60 },
    { type: "EXPENSE", amount: 1000, description: "Materiales mantenimiento lanchas", category: "Materiales", daysAgo: 30 },
  ])

  await seedPettyCash(propZ14.id, 850, 2000, [
    { type: "REPLENISHMENT", amount: 2000, description: "Reposicion trimestral", daysAgo: 45 },
    { type: "EXPENSE", amount: 150, description: "Productos limpieza", category: "Limpieza", daysAgo: 30 },
    { type: "EXPENSE", amount: 1100, description: "Recarga A/C R-410A (tk3)", category: "Electricidad", daysAgo: 1 },
    { type: "REPLENISHMENT", amount: 100, description: "Ajuste por diferencia", daysAgo: 1 },
  ])

  await seedPettyCash(propOficina.id, 2600, 3000, [
    { type: "REPLENISHMENT", amount: 3000, description: "Fondos caja chica oficina", daysAgo: 30 },
    { type: "EXPENSE", amount: 200, description: "Articulos de oficina", category: "Varios", daysAgo: 15 },
    { type: "EXPENSE", amount: 200, description: "Cafe y agua purificada", category: "Varios", daysAgo: 7 },
  ])

  await seedPettyCash(propBodega.id, 450, 2000, [
    { type: "REPLENISHMENT", amount: 2000, description: "Fondos iniciales bodega", daysAgo: 90 },
    { type: "EXPENSE", amount: 300, description: "Candados y cerraduras", category: "Seguridad", daysAgo: 60 },
    { type: "EXPENSE", amount: 450, description: "Escobas y utensilios limpieza", category: "Limpieza", daysAgo: 40 },
    { type: "EXPENSE", amount: 800, description: "Materiales menores reparacion", category: "Materiales", daysAgo: 12 },
  ])

  // ─── MAINTENANCE TICKETS ─────────────────────────────────────────────────────
  const tk1 = await prisma.maintenanceRequest.create({ data: {
    organizationId: org.id, ticketNumber: "T-001", propertyId: propCayala.id,
    category: "PLUMBING", priority: "HIGH", status: "IN_PROGRESS",
    title: "Fuga en tuberia de jardin",
    description: "Se reporto fuga de agua en area de jardin trasero. Requiere reemplazo de tubo PVC 2 pulgadas.",
    reportedBy: "Ana Lopez", reportedPhone: "5588-7766",
    reportedAt: subDays(now, 5), assignedToId: supervisor.id, assignedAt: subDays(now, 4), startedAt: subDays(now, 3),
    paymentMode: "PROVEEDOR", estimatedCost: 3500,
  }})
  await prisma.maintenanceTimelineEvent.createMany({ data: [
    { ticketId: tk1.id, type: "STATUS_CHANGE", message: "Ticket creado — Fuga en tuberia de jardin", createdAt: subDays(now, 5) },
    { ticketId: tk1.id, type: "ASSIGNMENT", message: "Asignado a Luis Herrera", createdAt: subDays(now, 4) },
    { ticketId: tk1.id, type: "STATUS_CHANGE", message: "Estado cambiado a: IN_PROGRESS", createdAt: subDays(now, 3) },
    { ticketId: tk1.id, type: "NOTE", message: "Modo de pago: PROVEEDOR (con proveedor)", createdAt: subDays(now, 3) },
  ]})

  const tk2 = await prisma.maintenanceRequest.create({ data: {
    organizationId: org.id, ticketNumber: "T-002", propertyId: propMonterrico.id,
    category: "ELECTRICAL", priority: "URGENT", status: "REPORTED",
    title: "Cortocircuito en sala", description: "Breaker principal salta repetidamente al conectar electrodomesticos en sala.",
    reportedBy: "Encargado Monterrico", reportedPhone: "4422-3311",
    reportedAt: subDays(now, 2),
  }})
  await prisma.maintenanceTimelineEvent.create({ data: {
    ticketId: tk2.id, type: "STATUS_CHANGE", message: "Ticket creado — Cortocircuito en sala", createdAt: subDays(now, 2),
  }})

  const tk3 = await prisma.maintenanceRequest.create({ data: {
    organizationId: org.id, ticketNumber: "T-003", propertyId: propZ14.id,
    category: "HVAC", priority: "MEDIUM", status: "COMPLETED",
    title: "A/C no enfria eficientemente",
    description: "Unidad de A/C Samsung en recamara master pierde eficiencia. Posible bajo nivel de refrigerante.",
    assignedToId: assistant1.id, assignedAt: subDays(now, 3), startedAt: subDays(now, 2),
    reportedAt: subDays(now, 7),
    paymentMode: "CAJA_CHICA", estimatedCost: 1200, totalAmount: 1100, amountPaid: 1100, actualCost: 1100,
    completedAt: subDays(now, 1),
  }})
  await prisma.maintenanceTimelineEvent.createMany({ data: [
    { ticketId: tk3.id, type: "STATUS_CHANGE", message: "Ticket creado — A/C no enfria", createdAt: subDays(now, 7) },
    { ticketId: tk3.id, type: "ASSIGNMENT", message: "Asignado a Maria Torres", createdAt: subDays(now, 3) },
    { ticketId: tk3.id, type: "QUOTE_ADDED", message: "Cotizacion agregada: Q1,100.00", createdAt: subDays(now, 2) },
    { ticketId: tk3.id, type: "PAYMENT", message: "Pago registrado: Q1,100.00 via CAJA_CHICA", createdAt: subDays(now, 1) },
    { ticketId: tk3.id, type: "STATUS_CHANGE", message: "Estado cambiado a: COMPLETED", createdAt: subDays(now, 1) },
  ]})
  await prisma.ticketPayment.create({ data: {
    ticketId: tk3.id, amount: 1100, method: "CAJA_CHICA",
    date: subDays(now, 1), reference: "CAJA-Z14-001", notes: "Recarga de refrigerante R-410A",
  }})

  const tk4 = await prisma.maintenanceRequest.create({ data: {
    organizationId: org.id, ticketNumber: "T-004", propertyId: propOficina.id,
    category: "SECURITY", priority: "LOW", status: "REPORTED",
    title: "Camara de seguridad sin imagen",
    description: "Camara exterior del parqueo no transmite señal. Posible problema en cable o en cabeza de camara.",
    reportedAt: subDays(now, 10),
  }})
  await prisma.maintenanceTimelineEvent.create({ data: {
    ticketId: tk4.id, type: "STATUS_CHANGE", message: "Ticket creado — Camara de seguridad sin imagen", createdAt: subDays(now, 10),
  }})

  const tk5 = await prisma.maintenanceRequest.create({ data: {
    organizationId: org.id, ticketNumber: "T-005", propertyId: propCayala.id,
    category: "OTHER", priority: "MEDIUM", status: "COMPLETED",
    title: "Puerta de garage atascada",
    description: "Motor de puerta automatica presenta falla al abrir. Se reviso y ajusto cadena + cambio de motor.",
    reportedAt: subDays(now, 20), assignedAt: subDays(now, 19), startedAt: subDays(now, 18), completedAt: subDays(now, 15),
    paymentMode: "CAJA_CHICA", estimatedCost: 2800, actualCost: 2500, totalAmount: 2500, amountPaid: 2500,
  }})
  await prisma.maintenanceTimelineEvent.createMany({ data: [
    { ticketId: tk5.id, type: "STATUS_CHANGE", message: "Ticket creado — Puerta de garage atascada", createdAt: subDays(now, 20) },
    { ticketId: tk5.id, type: "PAYMENT", message: "Pago registrado: Q2,500.00 via CAJA_CHICA", createdAt: subDays(now, 15) },
    { ticketId: tk5.id, type: "STATUS_CHANGE", message: "Estado cambiado a: COMPLETED", createdAt: subDays(now, 15) },
  ]})

  // T-006: Ticket con 2 cotizaciones (apto para mostrar botón "Convertir a proyecto")
  const tk6 = await prisma.maintenanceRequest.create({ data: {
    organizationId: org.id, ticketNumber: "T-006", propertyId: propBodega.id,
    category: "STRUCTURAL", priority: "HIGH", status: "ASSIGNED",
    title: "Filtracion de agua en techo",
    description: "Se detectaron filtraciones en 3 puntos del techo metálico. Requiere sellado y posiblemente reemplazo de láminas.",
    reportedBy: "Encargado Bodega", reportedAt: subDays(now, 12),
    assignedToId: supervisor.id, assignedAt: subDays(now, 11),
    paymentMode: "PROVEEDOR", estimatedCost: 18000,
  }})
  await prisma.maintenanceTimelineEvent.createMany({ data: [
    { ticketId: tk6.id, type: "STATUS_CHANGE", message: "Ticket creado — Filtracion de agua en techo", createdAt: subDays(now, 12) },
    { ticketId: tk6.id, type: "ASSIGNMENT", message: "Asignado a Luis Herrera", createdAt: subDays(now, 11) },
    { ticketId: tk6.id, type: "NOTE", message: "Se solicitaron 2 cotizaciones a proveedores", createdAt: subDays(now, 8) },
  ]})
  // ticketQuotes para tk6 added after vendors section below

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

  // TicketQuotes for tk6 (needs v1, v3)
  await prisma.ticketQuote.createMany({ data: [
    { ticketId: tk6.id, vendorId: v3.id, amount: 22000, notes: "Reemplazo completo de secciones afectadas + sellador", status: "PENDING" },
    { ticketId: tk6.id, vendorId: v1.id, amount: 15500, notes: "Sellado de juntas + impermeabilizacion", status: "PENDING" },
  ]})

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

  // ─── SEED v4: RICH PAYMENT DATA ─────────────────────────────────────────────

  // 1. Constructora Vega (partida2): mark existing payment as 50% anticipo
  await prisma.partidaPayment.updateMany({
    where: { partidaId: partida2.id },
    data: { type: "ADVANCE", percentageOfTotal: 50 },
  })

  // 2. Clima Total GT (v4): new partida + 50% anticipo payment
  const partida8 = await prisma.projectPartida.create({ data: {
    projectId: proj2.id, name: "Instalacion equipos A/C",
    budgetEstimate: 20160, amountApproved: 20160, amountPaid: 10080,
    vendorId: v4.id, status: "IN_PROGRESS", orderIndex: 2,
  }})
  await prisma.partidaPayment.create({ data: {
    partidaId: partida8.id, amount: 10080, type: "ADVANCE",
    date: subDays(now, 12), method: "TRANSFER", reference: "TRF-CLIMA-001",
    percentageOfTotal: 50, notes: "Anticipo 50% para iniciar instalacion",
  }})

  // 3. Mobitec (partida7): final payment with Q200 discount
  const mobitecRemaining = 8960 - 8000  // Q960 remaining after Q8000 advance
  const mobitecDiscount = 200
  await prisma.partidaPayment.create({ data: {
    partidaId: partida7.id, amount: mobitecRemaining - mobitecDiscount,
    type: "FINAL", date: subDays(now, 1),
    method: "TRANSFER", reference: "TRF-MOBITEC-002",
    percentageOfTotal: 100, closesWithDiscount: true,
    discountAmount: mobitecDiscount, discountReason: "Retencion por ajuste de instalacion",
    notes: "Liquidacion final con descuento negociado",
  }})
  await prisma.projectPartida.update({
    where: { id: partida7.id },
    data: { amountPaid: 8000 + (mobitecRemaining - mobitecDiscount), status: "PAID" },
  })

  // 4. Pintor Don Mario: new vendor + partida sin pagos
  const vPintor = await prisma.vendor.create({ data: {
    organizationId: org.id, name: "Pintor Don Mario",
    category: "PAINTING", contactName: "Mario Solis", phone: "5533-9977",
    notes: "Trabaja por días, pago en efectivo",
  }})
  const partida9 = await prisma.projectPartida.create({ data: {
    projectId: proj1.id, name: "Pintura interior recamaras",
    budgetEstimate: 8500, amountApproved: 8000, amountPaid: 0,
    vendorId: vPintor.id, status: "APPROVED", orderIndex: 3,
  }})

  // ─── SEED v5: PROYECTOS CON AUDIT TRAIL COMPLETO ────────────────────────────

  // Helper: create activity log entry
  async function log(params: {
    entityType: string; entityId: string; projectId?: string; action: string
    actorId: string; actorName: string; metadata?: Record<string, unknown>; daysAgo: number
  }) {
    await prisma.activityLog.create({ data: {
      organizationId: org.id, entityType: params.entityType, entityId: params.entityId,
      projectId: params.projectId ?? null, action: params.action,
      actorId: params.actorId, actorName: params.actorName,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      createdAt: subDays(now, params.daysAgo),
    }})
  }

  // New property for "Torre Reforma"
  const propTorreReforma = await prisma.property.create({ data: {
    organizationId: org.id, name: "Torre Reforma Piso 12",
    type: "APARTMENT", status: "RENTED",
    addressLine: "Blvd. Los Próceres 18-50 Piso 12", zone: "Zona 10",
    city: "Guatemala", department: "Guatemala",
    bedrooms: 3, bathrooms: 2.5, builtArea: 180, currentValue: 2200000,
  }})

  // ── PROYECTO 1: Remodelación Cocina Monterrico ──────────────────────────────
  const projCocina = await prisma.project.create({ data: {
    organizationId: org.id, propertyId: propMonterrico.id,
    type: "RENOVATION", name: "Remodelación Cocina Monterrico",
    description: "Remodelación completa de cocina: isla central, gabinetes nuevos, pisos importados y aires acondicionados.",
    status: "IN_PROGRESS", budgetEstimate: 185000,
    startDate: subMonths(now, 3), endDate: addMonths(now, 1),
    progressPercent: 60,
  }})
  await log({ entityType: "PROJECT", entityId: projCocina.id, projectId: projCocina.id, action: "CREATED", actorId: admin.id, actorName: "Carlos Mendez", daysAgo: 90 })

  // Partida 1: Demolición
  const pCocinaDemolicion = await prisma.projectPartida.create({ data: {
    projectId: projCocina.id, name: "Demolición y preparación",
    budgetEstimate: 18000, amountApproved: 17500, amountPaid: 17500,
    vendorId: v3.id, status: "PAID", deliveredAt: subDays(now, 45), orderIndex: 0,
  }})
  await log({ entityType: "PARTIDA", entityId: pCocinaDemolicion.id, projectId: projCocina.id, action: "CREATED", actorId: manager.id, actorName: "Sofia Giron", daysAgo: 88, metadata: { name: "Demolición y preparación" } })
  // Quotes
  const qCocinaDemol1 = await prisma.quote.create({ data: {
    organizationId: org.id, vendorId: v3.id, projectId: projCocina.id, partidaId: pCocinaDemolicion.id,
    quoteNumber: "COT-C-001", date: subDays(now, 85),
    subtotal: 17500, taxAmount: 0, total: 17500, status: "APPROVED",
    approvedAt: subDays(now, 82), approvedBy: admin.name,
  }})
  const qCocinaDemol2 = await prisma.quote.create({ data: {
    organizationId: org.id, vendorId: v7.id, projectId: projCocina.id, partidaId: pCocinaDemolicion.id,
    quoteNumber: "COT-C-002", date: subDays(now, 84),
    subtotal: 21000, taxAmount: 0, total: 21000, status: "PENDING",
  }})
  await prisma.projectPartida.update({ where: { id: pCocinaDemolicion.id }, data: { approvedQuoteId: qCocinaDemol1.id } })
  await log({ entityType: "PARTIDA", entityId: pCocinaDemolicion.id, projectId: projCocina.id, action: "APPROVED", actorId: admin.id, actorName: "Carlos Mendez", daysAgo: 82, metadata: { vendor: "Constructora Vega SA", amount: 17500 } })
  // Payments
  const payDemolAnt = await prisma.partidaPayment.create({ data: {
    partidaId: pCocinaDemolicion.id, amount: 8750, type: "ADVANCE",
    date: subDays(now, 80), method: "TRANSFER", reference: "TRF-COCINA-001",
    percentageOfTotal: 50, notes: "Anticipo 50%",
  }})
  await log({ entityType: "PAYMENT", entityId: payDemolAnt.id, projectId: projCocina.id, action: "PAYMENT_REGISTERED", actorId: assistant1.id, actorName: "Maria Torres", daysAgo: 80, metadata: { amount: 8750, partida: "Demolición y preparación", vendor: "Constructora Vega SA", percentageOfTotal: 50, method: "TRANSFER" } })
  const payDemolFinal = await prisma.partidaPayment.create({ data: {
    partidaId: pCocinaDemolicion.id, amount: 8750, type: "FINAL",
    date: subDays(now, 45), method: "TRANSFER", reference: "TRF-COCINA-002",
    percentageOfTotal: 100, notes: "Pago final al entregar",
  }})
  await log({ entityType: "PAYMENT", entityId: payDemolFinal.id, projectId: projCocina.id, action: "PAYMENT_REGISTERED", actorId: manager.id, actorName: "Sofia Giron", daysAgo: 45, metadata: { amount: 8750, partida: "Demolición y preparación", vendor: "Constructora Vega SA", percentageOfTotal: 100, method: "TRANSFER" } })
  await log({ entityType: "PARTIDA", entityId: pCocinaDemolicion.id, projectId: projCocina.id, action: "DELIVERED", actorId: supervisor.id, actorName: "Luis Herrera", daysAgo: 45, metadata: { name: "Demolición y preparación" } })

  // Partida 2: Gabinetes y cocina
  const pCocinaGabinetes = await prisma.projectPartida.create({ data: {
    projectId: projCocina.id, name: "Gabinetes y cocina integral",
    budgetEstimate: 85000, amountApproved: 78000, amountPaid: 39000,
    vendorId: v8.id, status: "IN_PROGRESS", orderIndex: 1,
  }})
  await log({ entityType: "PARTIDA", entityId: pCocinaGabinetes.id, projectId: projCocina.id, action: "CREATED", actorId: supervisor.id, actorName: "Luis Herrera", daysAgo: 75, metadata: { name: "Gabinetes y cocina integral" } })
  const qGabinetes = await prisma.quote.create({ data: {
    organizationId: org.id, vendorId: v8.id, projectId: projCocina.id, partidaId: pCocinaGabinetes.id,
    quoteNumber: "COT-C-003", date: subDays(now, 72),
    subtotal: 78000, taxAmount: 0, total: 78000, status: "APPROVED",
    approvedAt: subDays(now, 68), approvedBy: admin.name,
  }})
  await prisma.projectPartida.update({ where: { id: pCocinaGabinetes.id }, data: { approvedQuoteId: qGabinetes.id } })
  await log({ entityType: "APPROVAL", entityId: "approval-gabinetes", projectId: projCocina.id, action: "APPROVAL_REQUESTED", actorId: manager.id, actorName: "Sofia Giron", daysAgo: 70, metadata: { vendor: "Mobitec Guatemala", amount: 78000, partida: "Gabinetes y cocina integral" } })
  await log({ entityType: "PARTIDA", entityId: pCocinaGabinetes.id, projectId: projCocina.id, action: "APPROVED", actorId: admin.id, actorName: "Carlos Mendez", daysAgo: 68, metadata: { vendor: "Mobitec Guatemala", amount: 78000 } })
  const payGabAnt = await prisma.partidaPayment.create({ data: {
    partidaId: pCocinaGabinetes.id, amount: 39000, type: "ADVANCE",
    date: subDays(now, 65), method: "TRANSFER", reference: "TRF-MOBITEC-COCI-001",
    percentageOfTotal: 50, notes: "Anticipo 50% para fabricación",
  }})
  await log({ entityType: "PAYMENT", entityId: payGabAnt.id, projectId: projCocina.id, action: "PAYMENT_REGISTERED", actorId: assistant2.id, actorName: "Pedro Vasquez", daysAgo: 65, metadata: { amount: 39000, partida: "Gabinetes y cocina integral", vendor: "Mobitec Guatemala", percentageOfTotal: 50, method: "TRANSFER" } })

  // Partida 3: Aires acondicionados (4 cotizaciones, 1 aprobada, 3 rechazadas)
  const pCocinaAC = await prisma.projectPartida.create({ data: {
    projectId: projCocina.id, name: "Aires acondicionados cocina",
    budgetEstimate: 35000, amountApproved: 32500, amountPaid: 32500,
    vendorId: v4.id, status: "PAID", deliveredAt: subDays(now, 10), orderIndex: 2,
  }})
  await log({ entityType: "PARTIDA", entityId: pCocinaAC.id, projectId: projCocina.id, action: "CREATED", actorId: assistant1.id, actorName: "Maria Torres", daysAgo: 60, metadata: { name: "Aires acondicionados cocina" } })
  // 4 cotizaciones
  const qACClima = await prisma.quote.create({ data: {
    organizationId: org.id, vendorId: v4.id, projectId: projCocina.id, partidaId: pCocinaAC.id,
    quoteNumber: "COT-C-AC-001", date: subDays(now, 55),
    subtotal: 32500, taxAmount: 0, total: 32500, status: "APPROVED",
    approvedAt: subDays(now, 48), approvedBy: admin.name, notes: "Incluye 2 mini-splits inverter 18000 BTU + instalacion",
  }})
  await prisma.quote.create({ data: {
    organizationId: org.id, vendorId: v2.id, projectId: projCocina.id, partidaId: pCocinaAC.id,
    quoteNumber: "COT-C-AC-002", date: subDays(now, 54),
    subtotal: 38000, taxAmount: 0, total: 38000, status: "REJECTED", notes: "Precio mas alto sin garantia extendida",
  }})
  await prisma.quote.create({ data: {
    organizationId: org.id, vendorId: v6.id, projectId: projCocina.id, partidaId: pCocinaAC.id,
    quoteNumber: "COT-C-AC-003", date: subDays(now, 52),
    subtotal: 41000, taxAmount: 0, total: 41000, status: "REJECTED", notes: "Fuera de presupuesto",
  }})
  await prisma.quote.create({ data: {
    organizationId: org.id, vendorId: v5.id, projectId: projCocina.id, partidaId: pCocinaAC.id,
    quoteNumber: "COT-C-AC-004", date: subDays(now, 50),
    subtotal: 29000, taxAmount: 0, total: 29000, status: "REJECTED", notes: "No incluia mano de obra calificada",
  }})
  await prisma.projectPartida.update({ where: { id: pCocinaAC.id }, data: { approvedQuoteId: qACClima.id } })
  await log({ entityType: "PARTIDA", entityId: pCocinaAC.id, projectId: projCocina.id, action: "QUOTE_ADDED", actorId: assistant1.id, actorName: "Maria Torres", daysAgo: 55, metadata: { amount: 32500, vendorId: v4.id } })
  await log({ entityType: "APPROVAL", entityId: "approval-ac", projectId: projCocina.id, action: "APPROVAL_REQUESTED", actorId: supervisor.id, actorName: "Luis Herrera", daysAgo: 50, metadata: { vendor: "Clima Total GT", amount: 32500, partida: "Aires acondicionados" } })
  await log({ entityType: "PARTIDA", entityId: pCocinaAC.id, projectId: projCocina.id, action: "APPROVED", actorId: admin.id, actorName: "Carlos Mendez", daysAgo: 48, metadata: { vendor: "Clima Total GT", amount: 32500 } })
  // CASE 1: 80% anticipo + ACCEPTED + 20% final
  const payACAnt = await prisma.partidaPayment.create({ data: {
    partidaId: pCocinaAC.id, amount: 26000, type: "ADVANCE",
    date: subDays(now, 45), method: "TRANSFER", reference: "TRF-CLIMA-COCI-001",
    percentageOfTotal: 80, notes: "Anticipo 80% (límite sin aceptación)",
  }})
  await log({ entityType: "PAYMENT", entityId: payACAnt.id, projectId: projCocina.id, action: "PAYMENT_REGISTERED", actorId: manager.id, actorName: "Sofia Giron", daysAgo: 45, metadata: { amount: 26000, partida: "Aires acondicionados cocina", vendor: "Clima Total GT", percentageOfTotal: 80, method: "TRANSFER" } })
  const payACFinal = await prisma.partidaPayment.create({ data: {
    partidaId: pCocinaAC.id, amount: 6500, type: "FINAL",
    date: subDays(now, 9), method: "TRANSFER", reference: "TRF-CLIMA-COCI-002",
    percentageOfTotal: 100, notes: "Pago final 20% tras aceptación de servicio",
  }})
  await log({ entityType: "PAYMENT", entityId: payACFinal.id, projectId: projCocina.id, action: "PAYMENT_REGISTERED", actorId: admin.id, actorName: "Juan Mendez", daysAgo: 9, metadata: { amount: 6500, partida: "Aires acondicionados cocina", vendor: "Clima Total GT", percentageOfTotal: 100, method: "TRANSFER" } })
  await log({ entityType: "PARTIDA", entityId: pCocinaAC.id, projectId: projCocina.id, action: "DELIVERED", actorId: supervisor.id, actorName: "Luis Herrera", daysAgo: 10, metadata: { name: "Aires acondicionados cocina" } })
  await prisma.projectPartida.update({ where: { id: pCocinaAC.id }, data: { amountPaid: 32500 } })

  // Partida 4: Pisos importados (pendiente)
  const pCocinaFlooring = await prisma.projectPartida.create({ data: {
    projectId: projCocina.id, name: "Pisos importados porcelanato",
    budgetEstimate: 48000, status: "QUOTING", orderIndex: 3,
  }})
  await log({ entityType: "PARTIDA", entityId: pCocinaFlooring.id, projectId: projCocina.id, action: "CREATED", actorId: assistant2.id, actorName: "Pedro Vasquez", daysAgo: 20, metadata: { name: "Pisos importados porcelanato" } })
  await prisma.quote.create({ data: {
    organizationId: org.id, vendorId: v3.id, projectId: projCocina.id, partidaId: pCocinaFlooring.id,
    quoteNumber: "COT-C-F-001", date: subDays(now, 18),
    subtotal: 45000, taxAmount: 0, total: 45000, status: "PENDING", notes: "Porcelanato italiano 60x60",
  }})

  // ── PROYECTO 2: Paneles Solares Torre Reforma ───────────────────────────────
  const projSolar = await prisma.project.create({ data: {
    organizationId: org.id, propertyId: propTorreReforma.id,
    type: "ELECTRICAL", name: "Paneles Solares Torre Reforma",
    description: "Instalación de sistema fotovoltaico 15kW en terraza. Reducción estimada 70% consumo eléctrico.",
    status: "PLANNING", budgetEstimate: 145000,
    startDate: addMonths(now, 1), endDate: addMonths(now, 4),
    progressPercent: 0,
  }})
  await log({ entityType: "PROJECT", entityId: projSolar.id, projectId: projSolar.id, action: "CREATED", actorId: admin.id, actorName: "Carlos Mendez", daysAgo: 30, metadata: { name: "Paneles Solares Torre Reforma" } })

  // Partida 1: Paneles y onduladores
  const pSolarPaneles = await prisma.projectPartida.create({ data: {
    projectId: projSolar.id, name: "Paneles solares + inversor",
    budgetEstimate: 105000, status: "QUOTING", orderIndex: 0,
  }})
  await log({ entityType: "PARTIDA", entityId: pSolarPaneles.id, projectId: projSolar.id, action: "CREATED", actorId: supervisor.id, actorName: "Luis Herrera", daysAgo: 25, metadata: { name: "Paneles solares + inversor" } })
  // 2 cotizaciones
  const qSolar1 = await prisma.quote.create({ data: {
    organizationId: org.id, vendorId: v2.id, projectId: projSolar.id, partidaId: pSolarPaneles.id,
    quoteNumber: "COT-S-001", date: subDays(now, 22),
    validUntil: addDays(now, 38), subtotal: 98000, taxAmount: 0, total: 98000,
    status: "PENDING", notes: "Paneles Canadian Solar 400W × 30 + Inversor Fronius 15kW",
  }})
  await prisma.quoteItem.createMany({ data: [
    { quoteId: qSolar1.id, description: "Panel Canadian Solar 400W", quantity: 30, unitPrice: 2800, total: 84000 },
    { quoteId: qSolar1.id, description: "Inversor Fronius Primo 15kW", quantity: 1, unitPrice: 14000, total: 14000 },
  ]})
  await log({ entityType: "PARTIDA", entityId: pSolarPaneles.id, projectId: projSolar.id, action: "QUOTE_ADDED", actorId: assistant1.id, actorName: "Maria Torres", daysAgo: 22, metadata: { amount: 98000, vendorId: v2.id } })

  const qSolar2 = await prisma.quote.create({ data: {
    organizationId: org.id, vendorId: v4.id, projectId: projSolar.id, partidaId: pSolarPaneles.id,
    quoteNumber: "COT-S-002", date: subDays(now, 18),
    validUntil: addDays(now, 42), subtotal: 112000, taxAmount: 0, total: 112000,
    status: "PENDING", notes: "Paneles Jinko Tiger 450W × 30 + Inversor SMA 15kW — premium",
  }})
  await prisma.quoteItem.createMany({ data: [
    { quoteId: qSolar2.id, description: "Panel Jinko Tiger 450W", quantity: 30, unitPrice: 3200, total: 96000 },
    { quoteId: qSolar2.id, description: "Inversor SMA Sunny Boy 15kW", quantity: 1, unitPrice: 16000, total: 16000 },
  ]})
  await log({ entityType: "PARTIDA", entityId: pSolarPaneles.id, projectId: projSolar.id, action: "QUOTE_ADDED", actorId: assistant2.id, actorName: "Pedro Vasquez", daysAgo: 18, metadata: { amount: 112000, vendorId: v4.id } })

  // ApprovalRequest PENDING_COSIGN for qSolar1
  const arSolar = await prisma.approvalRequest.create({ data: {
    organizationId: org.id, entityType: "PROJECT_PARTIDA", entityId: pSolarPaneles.id,
    relatedId: qSolar1.id, requestedById: supervisor.id,
    cosignerId: manager.id, status: "PENDING_COSIGN",
    title: "Aprobar cotización: Electro Servicios GT — Paneles Solares Torre Reforma",
    amount: qSolar1.total,
    notes: "Partida: Paneles solares + inversor",
    createdAt: subDays(now, 15),
  }})
  await log({ entityType: "APPROVAL", entityId: arSolar.id, projectId: projSolar.id, action: "APPROVAL_REQUESTED", actorId: supervisor.id, actorName: "Luis Herrera", daysAgo: 15, metadata: { vendor: "Electro Servicios GT", amount: 98000, partida: "Paneles solares + inversor" } })

  // Partida 2: Instalación eléctrica
  const pSolarElect = await prisma.projectPartida.create({ data: {
    projectId: projSolar.id, name: "Instalación eléctrica y conexión a red",
    budgetEstimate: 40000, status: "QUOTING", orderIndex: 1,
  }})
  await log({ entityType: "PARTIDA", entityId: pSolarElect.id, projectId: projSolar.id, action: "CREATED", actorId: manager.id, actorName: "Sofia Giron", daysAgo: 20, metadata: { name: "Instalación eléctrica y conexión a red" } })
  await prisma.quote.create({ data: {
    organizationId: org.id, vendorId: v2.id, projectId: projSolar.id, partidaId: pSolarElect.id,
    quoteNumber: "COT-S-003", date: subDays(now, 12),
    validUntil: addDays(now, 48), subtotal: 38000, taxAmount: 0, total: 38000,
    status: "PENDING", notes: "Cableado, tablero de distribución, medidor bidireccional",
  }})
  await log({ entityType: "PARTIDA", entityId: pSolarElect.id, projectId: projSolar.id, action: "QUOTE_ADDED", actorId: assistant1.id, actorName: "Maria Torres", daysAgo: 12, metadata: { amount: 38000 } })

  // ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
  await prisma.notification.createMany({ data: [
    { organizationId: org.id, userId: admin.id, type: "CONTRACT_EXPIRING", title: "Contrato por vencer", message: "Contrato de Ana Lopez en Casa Cayala vence en 45 dias", link: `/contratos/${c1.id}`, isRead: false },
    { organizationId: org.id, userId: admin.id, type: "CONTRACT_EXPIRING", title: "Contrato critico", message: "Contrato de Maria Fernanda en Bodega Mixco vence en 20 dias", link: `/contratos/${c4.id}`, isRead: false },
    { organizationId: org.id, userId: admin.id, type: "ASSET_RECORD_EXPIRING", title: "Seguro por vencer", message: "Lancha Monterrico A: Poliza Seguro 2024 vence en 5 dias", link: `/activos/${assetLancha1.id}`, isRead: false },
    { organizationId: org.id, userId: admin.id, type: "ASSET_RECORD_EXPIRED", title: "Matricula vencida", message: "Jet Ski Monterrico: Matricula vencio hace 10 dias", link: `/activos/${assetJetski.id}`, isRead: false },
    { organizationId: org.id, userId: admin.id, type: "INVOICE_OVERDUE", title: "Factura vencida", message: "Factura F-2025-003 de Soluciones TI esta vencida", link: `/contratos/${c3.id}`, isRead: true },
  ]})

  // ═══════════════════════════════════════════════════════════════════════════
  // SEED v6: SERVICE ACCEPTANCE SCENARIOS
  // ═══════════════════════════════════════════════════════════════════════════

  const crypto = await import("crypto")
  function hashFor(payload: unknown): string {
    return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex")
  }

  function snapshotPartida(p: { id: string; name: string; amountApproved: number | null; amountPaid: number; approvedQuoteId: string | null; projectId: string }, vendorName: string, projectName: string) {
    return {
      entityType: "PARTIDA", entityId: p.id, entityName: p.name,
      vendor: { id: "vendor", name: vendorName },
      amountApproved: p.amountApproved, amountPaid: p.amountPaid,
      approvedQuoteId: p.approvedQuoteId, projectId: p.projectId, projectName,
      capturedAt: new Date().toISOString(),
    }
  }

  // ── CASE 1: Aires acondicionados cocina — ACCEPTED ────────────────────────
  const acCase1 = await prisma.serviceAcceptance.create({ data: {
    organizationId: org.id, entityType: "PARTIDA", entityId: pCocinaAC.id, projectId: projCocina.id,
    status: "ACCEPTED",
    requestedById: assistant2.id,
    acceptedById: assistant1.id,
    requestedAt: subDays(now, 12), acceptedAt: subDays(now, 10),
    checklist: JSON.stringify([
      { key: "completed_on_time", checked: true },
      { key: "quality_as_expected", checked: true },
      { key: "equipment_working", checked: true },
      { key: "no_observations", checked: true },
      { key: "documentation_delivered", checked: true },
    ]),
    rating: 5,
    notes: "Instalación impecable, prueba de funcionamiento de ambos splits OK.",
    verificationHash: hashFor({ partida: pCocinaAC.id, rating: 5, acceptor: assistant1.id, timestamp: subDays(now, 10).toISOString() }),
    contextSnapshot: JSON.stringify(snapshotPartida({ id: pCocinaAC.id, name: "Aires acondicionados cocina", amountApproved: 32500, amountPaid: 26000, approvedQuoteId: qACClima.id, projectId: projCocina.id }, "Clima Total GT", "Remodelación Cocina Monterrico")),
    photos: { create: [
      { url: "evidencia/ac-cocina-1.jpg", caption: "Split master room instalado" },
      { url: "evidencia/ac-cocina-2.jpg", caption: "Prueba de funcionamiento" },
    ]},
  }})
  await log({ entityType: "PARTIDA", entityId: pCocinaAC.id, projectId: projCocina.id, action: "ACCEPTANCE_REQUESTED", actorId: assistant2.id, actorName: "Pedro Vasquez", daysAgo: 12, metadata: { acceptanceId: acCase1.id, name: "Aires acondicionados cocina", vendor: "Clima Total GT" } })
  await log({ entityType: "PARTIDA", entityId: pCocinaAC.id, projectId: projCocina.id, action: "SERVICE_ACCEPTED", actorId: assistant1.id, actorName: "Maria Gonzalez", daysAgo: 10, metadata: { acceptanceId: acCase1.id, name: "Aires acondicionados cocina", vendor: "Clima Total GT", rating: 5, hash: acCase1.verificationHash?.slice(0, 12) } })

  // ── CASE 2: Cableado eléctrico Solar — PENDING ────────────────────────────
  // Approve pSolarElect with q (need a vendor + amount). Use v2 (Electro Servicios)
  const qElectApproved = await prisma.quote.findFirst({ where: { partidaId: pSolarElect.id } })
  if (qElectApproved) {
    await prisma.quote.update({ where: { id: qElectApproved.id }, data: { status: "APPROVED", approvedAt: subDays(now, 8), approvedBy: admin.name } })
    await prisma.projectPartida.update({
      where: { id: pSolarElect.id },
      data: {
        approvedQuoteId: qElectApproved.id, vendorId: qElectApproved.vendorId,
        amountApproved: qElectApproved.total, amountPaid: Math.round(qElectApproved.total * 0.8),
        status: "IN_PROGRESS",
      },
    })
    await prisma.partidaPayment.create({ data: {
      partidaId: pSolarElect.id, amount: Math.round(qElectApproved.total * 0.8), type: "ADVANCE",
      date: subDays(now, 5), method: "TRANSFER", reference: "TRF-CABLEADO-001",
      percentageOfTotal: 80, notes: "Anticipo 80% — sin aceptación aún",
    }})
    await prisma.approvalRequest.create({ data: {
      organizationId: org.id, entityType: "PROJECT_PARTIDA", entityId: pSolarElect.id,
      relatedId: qElectApproved.id, requestedById: manager.id, approvedById: admin.id,
      status: "APPROVED", approvedAt: subDays(now, 8),
      title: "Aprobar cotización Cableado eléctrico", amount: qElectApproved.total,
    }})
    const acCase2 = await prisma.serviceAcceptance.create({ data: {
      organizationId: org.id, entityType: "PARTIDA", entityId: pSolarElect.id, projectId: projSolar.id,
      status: "PENDING",
      requestedById: assistant2.id,
      requestedAt: subDays(now, 1),
      contextSnapshot: JSON.stringify(snapshotPartida({ id: pSolarElect.id, name: "Instalación eléctrica y conexión a red", amountApproved: qElectApproved.total, amountPaid: Math.round(qElectApproved.total * 0.8), approvedQuoteId: qElectApproved.id, projectId: projSolar.id }, "Electro Servicios GT", "Paneles Solares Torre Reforma")),
    }})
    await log({ entityType: "PARTIDA", entityId: pSolarElect.id, projectId: projSolar.id, action: "ACCEPTANCE_REQUESTED", actorId: assistant2.id, actorName: "Pedro Vasquez", daysAgo: 1, metadata: { acceptanceId: acCase2.id, name: "Instalación eléctrica y conexión a red", vendor: "Electro Servicios GT" } })
    // Notify acceptors
    for (const u of [assistant1, manager]) {
      await prisma.notification.create({ data: {
        organizationId: org.id, userId: u.id,
        type: "SERVICE_ACCEPTANCE_PENDING",
        title: "Aceptación de servicio pendiente",
        message: "Pedro Vasquez solicita aceptar Cableado eléctrico Torre Reforma",
        link: `/aceptaciones/${acCase2.id}`,
      }})
    }
  }

  // ── CASE 3: Pintura interior recamaras — REJECTED ─────────────────────────
  // Use existing partida9 — but it has no amountPaid yet. Make it 80% paid + REJECTED acceptance.
  await prisma.partidaPayment.create({ data: {
    partidaId: partida9.id, amount: 6400, type: "ADVANCE",
    date: subDays(now, 14), method: "TRANSFER", reference: "TRF-PINTOR-001",
    percentageOfTotal: 80, notes: "Anticipo 80%",
  }})
  await prisma.projectPartida.update({ where: { id: partida9.id }, data: { amountPaid: 6400, status: "IN_PROGRESS" } })
  const acCase3 = await prisma.serviceAcceptance.create({ data: {
    organizationId: org.id, entityType: "PARTIDA", entityId: partida9.id, projectId: proj1.id,
    status: "REJECTED",
    requestedById: assistant2.id,
    rejectedById: manager.id,
    requestedAt: subDays(now, 6), rejectedAt: subDays(now, 4),
    rejectionReason: "Falta documentación de garantía y manchas en pared norte sin corregir",
    requiredCorrections: "Entregar garantía firmada y resanar pared norte antes de re-solicitar",
    contextSnapshot: JSON.stringify(snapshotPartida({ id: partida9.id, name: "Pintura interior recamaras", amountApproved: 8000, amountPaid: 6400, approvedQuoteId: null, projectId: proj1.id }, "Pintor Don Mario", "Remodelacion Terraza Monterrico")),
  }})
  await log({ entityType: "PARTIDA", entityId: partida9.id, projectId: proj1.id, action: "ACCEPTANCE_REQUESTED", actorId: assistant2.id, actorName: "Pedro Vasquez", daysAgo: 6, metadata: { acceptanceId: acCase3.id, name: "Pintura interior recamaras", vendor: "Pintor Don Mario" } })
  await log({ entityType: "PARTIDA", entityId: partida9.id, projectId: proj1.id, action: "SERVICE_REJECTED", actorId: manager.id, actorName: "Sofia Giron", daysAgo: 4, metadata: { acceptanceId: acCase3.id, name: "Pintura interior recamaras", reason: "Falta documentación de garantía y manchas en pared norte sin corregir" } })

  // ── CASE 4: Ticket reparación cisterna Q8,000 ─────────────────────────────
  const tkCisterna = await prisma.maintenanceRequest.create({ data: {
    organizationId: org.id, ticketNumber: "M-2026-CIST",
    propertyId: propCayala.id,
    category: "PLUMBING", priority: "HIGH", status: "IN_PROGRESS",
    title: "Reparación de cisterna principal",
    description: "Cisterna 2500 L presenta fuga en lateral inferior. Requiere drenaje, reparación y prueba.",
    reportedAt: subDays(now, 8),
    assignedToId: supervisor.id, assignedAt: subDays(now, 7), startedAt: subDays(now, 6),
    paymentMode: "PROVEEDOR", vendorId: v1.id,
    estimatedCost: 8000, totalAmount: 8000, amountPaid: 4000,
  }})
  await prisma.ticketQuote.create({ data: {
    ticketId: tkCisterna.id, vendorId: v1.id, amount: 8000,
    status: "SELECTED", notes: "Reparación + prueba 24h",
  }})
  await prisma.ticketPayment.create({ data: {
    ticketId: tkCisterna.id, vendorId: v1.id, amount: 4000, method: "TRANSFER",
    date: subDays(now, 5), reference: "TRF-CIST-001",
    percentageOfTotal: 50, notes: "Anticipo 50% — siguiente pago requerirá aceptación",
  }})
  await prisma.maintenanceTimelineEvent.createMany({ data: [
    { ticketId: tkCisterna.id, type: "STATUS_CHANGE", message: "Ticket creado — Reparación de cisterna principal", createdAt: subDays(now, 8) },
    { ticketId: tkCisterna.id, type: "ASSIGNMENT", message: "Asignado a Luis Herrera", createdAt: subDays(now, 7) },
    { ticketId: tkCisterna.id, type: "QUOTE_ADDED", message: "Cotización agregada: Q8,000.00", createdAt: subDays(now, 6) },
    { ticketId: tkCisterna.id, type: "PAYMENT", message: "Pago registrado: Q4,000.00 via TRANSFER", createdAt: subDays(now, 5) },
  ]})

  // ── CASE 5: Ticket A/C Z14 — 100% caja chica (tk3 ya existe), no requiere aceptación ──
  await prisma.maintenanceTimelineEvent.create({ data: {
    ticketId: tk3.id, type: "NOTE",
    message: "Pago 100% vía CAJA_CHICA — exceptuado de aceptación de servicio",
    createdAt: subDays(now, 1),
  }})

  console.log("Seed v6 (Service Acceptance) completado exitosamente.")
  console.log(`Org: ${org.id}`)
  console.log(`Owner/Admin (Juan Mendez, NO acepta):     admin@demo.gt / demo1234`)
  console.log(`Manager (Sofia Giron, ACEPTA):            gerente@demo.gt / demo1234`)
  console.log(`Supervisor (Luis Herrera):                super@demo.gt / demo1234`)
  console.log(`Admin (Maria Gonzalez, ACEPTA):           asist1@demo.gt / demo1234`)
  console.log(`Assistant (Pedro Vasquez, solicita):      asist2@demo.gt / demo1234`)
  console.log(`Viewer (Ana Morales):                     demo@inmobiliaria.gt / demo1234`)
  console.log(`Assistant (Roberto Castillo):             roberto@demo.gt / demo1234`)
  console.log(`Cap de prepago: 80%`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
