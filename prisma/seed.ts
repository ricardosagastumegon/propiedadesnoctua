import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { subMonths, addMonths, addDays } from "date-fns"

const prisma = new PrismaClient()

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "demo" },
    update: {},
    create: { name: "Propiedades Demo GT", slug: "demo", type: "FAMILY", taxId: "CF" },
  })

  const passwordHash = await bcrypt.hash("demo1234", 10)
  const admin = await prisma.user.upsert({
    where: { email: "demo@inmobiliaria.gt" },
    update: {},
    create: { email: "demo@inmobiliaria.gt", name: "Carlos Mendez", passwordHash, role: "OWNER", organizationId: org.id },
  })

  // Clear all data for clean seed
  await prisma.notification.deleteMany({ where: { organizationId: org.id } })
  await prisma.assetServiceLog.deleteMany({ where: { asset: { organizationId: org.id } } })
  await prisma.asset.deleteMany({ where: { organizationId: org.id } })
  await prisma.quoteItem.deleteMany({ where: { quote: { organizationId: org.id } } })
  await prisma.quote.deleteMany({ where: { organizationId: org.id } })
  await prisma.vendor.deleteMany({ where: { organizationId: org.id } })
  await prisma.projectTask.deleteMany({ where: { project: { organizationId: org.id } } })
  await prisma.projectCost.deleteMany({ where: { project: { organizationId: org.id } } })
  await prisma.project.deleteMany({ where: { organizationId: org.id } })
  await prisma.maintenanceRequest.deleteMany({ where: { organizationId: org.id } })
  await prisma.invoice.deleteMany({ where: { organizationId: org.id } })
  await prisma.payment.deleteMany({ where: { organizationId: org.id } })
  await prisma.contract.deleteMany({ where: { organizationId: org.id } })
  await prisma.property.deleteMany({ where: { organizationId: org.id } })
  await prisma.tenant.deleteMany({ where: { organizationId: org.id } })
  await prisma.employee.deleteMany({ where: { organizationId: org.id } })

  // ─── PROPERTIES ─────────────────────────────────────────────────────────────
  const now = new Date()

  const propCayala = await prisma.property.create({ data: {
    organizationId: org.id,
    name: "Casa Cayala",
    type: "HOUSE", status: "RENTED",
    addressLine: "Boulevard Cayala 12-34", zone: "Zona 16", city: "Guatemala", department: "Guatemala",
    bedrooms: 4, bathrooms: 3.5, builtArea: 320, currentValue: 2800000,
  }})

  const propMonterrico = await prisma.property.create({ data: {
    organizationId: org.id,
    name: "Chalet Monterrico",
    type: "CHALET", status: "AVAILABLE",
    addressLine: "Aldea Monterrico km 110", city: "Taxisco", department: "Santa Rosa",
    bedrooms: 5, bathrooms: 4, builtArea: 280, currentValue: 1500000,
  }})

  const propApartamento = await prisma.property.create({ data: {
    organizationId: org.id,
    name: "Apto Zona 14",
    type: "APARTMENT", status: "RENTED",
    addressLine: "Av. Las Americas 8-50, Ed. Tiffany", zone: "Zona 14", city: "Guatemala", department: "Guatemala",
    bedrooms: 2, bathrooms: 2, builtArea: 110, currentValue: 950000,
  }})

  const propOficina = await prisma.property.create({ data: {
    organizationId: org.id,
    name: "Oficina Zona 10",
    type: "OFFICE", status: "RENTED",
    addressLine: "Blvd. Los Proceres 15-60, Torre Sixtino", zone: "Zona 10", city: "Guatemala", department: "Guatemala",
    builtArea: 85, currentValue: 750000,
  }})

  const propBodega = await prisma.property.create({ data: {
    organizationId: org.id,
    name: "Bodega Mixco",
    type: "WAREHOUSE", status: "MAINTENANCE",
    addressLine: "Km 13 Calzada Roosevelt", city: "Mixco", department: "Guatemala",
    builtArea: 500, currentValue: 600000,
  }})

  // ─── TENANTS ────────────────────────────────────────────────────────────────
  const tenantAna = await prisma.tenant.create({ data: {
    organizationId: org.id,
    fullName: "Ana Patricia Lopez", documentType: "DPI", documentNumber: "2345678901234",
    email: "ana.lopez@gmail.com", phone: "5534-9871", type: "INDIVIDUAL",
    emergencyContact: "Mario Lopez", emergencyPhone: "5512-3456",
  }})

  const tenantRoberto = await prisma.tenant.create({ data: {
    organizationId: org.id,
    fullName: "Roberto Castillo Ruiz", documentType: "DPI", documentNumber: "1234567890123",
    email: "rcastillo@email.com", phone: "4455-6677", type: "INDIVIDUAL",
    emergencyContact: "Lucia Ruiz", emergencyPhone: "5500-1122",
  }})

  const tenantEmpresa = await prisma.tenant.create({ data: {
    organizationId: org.id,
    fullName: "Soluciones Digitales GT S.A.", documentType: "NIT", documentNumber: "1234567-8",
    email: "admin@solucionesgt.com", phone: "2267-8900", type: "COMPANY",
  }})

  const tenantMaria = await prisma.tenant.create({ data: {
    organizationId: org.id,
    fullName: "Maria Fernanda Gomez", documentType: "DPI", documentNumber: "9876543210123",
    email: "mfgomez@hotmail.com", phone: "5599-4433", type: "INDIVIDUAL",
    emergencyContact: "Jose Gomez", emergencyPhone: "5588-7766",
  }})

  // ─── CONTRACTS ──────────────────────────────────────────────────────────────
  const contractStart6mo = subMonths(now, 6)
  const contractActive1 = await prisma.contract.create({ data: {
    organizationId: org.id,
    contractNumber: "C-2024-0001",
    propertyId: propCayala.id,
    tenantId: tenantAna.id,
    status: "ACTIVE",
    startDate: contractStart6mo,
    endDate: addMonths(contractStart6mo, 12),
    monthlyRent: 12000,
    deposit: 24000,
    paymentFrequency: "MONTHLY",
    paymentDueDay: 5,
    signedAt: contractStart6mo,
  }})

  const contractActive2 = await prisma.contract.create({ data: {
    organizationId: org.id,
    contractNumber: "C-2024-0002",
    propertyId: propApartamento.id,
    tenantId: tenantRoberto.id,
    status: "ACTIVE",
    startDate: subMonths(now, 3),
    endDate: addMonths(now, 9),
    monthlyRent: 5500,
    deposit: 11000,
    paymentFrequency: "MONTHLY",
    paymentDueDay: 1,
    signedAt: subMonths(now, 3),
  }})

  const contractActive3 = await prisma.contract.create({ data: {
    organizationId: org.id,
    contractNumber: "C-2024-0003",
    propertyId: propOficina.id,
    tenantId: tenantEmpresa.id,
    status: "ACTIVE",
    startDate: subMonths(now, 10),
    endDate: addDays(now, 45),
    monthlyRent: 6000,
    deposit: 12000,
    paymentFrequency: "MONTHLY",
    paymentDueDay: 1,
    signedAt: subMonths(now, 10),
  }})

  const contractExpiring = await prisma.contract.create({ data: {
    organizationId: org.id,
    contractNumber: "C-2025-0001",
    propertyId: propBodega.id,
    tenantId: tenantMaria.id,
    status: "ACTIVE",
    startDate: subMonths(now, 11),
    endDate: addDays(now, 20),
    monthlyRent: 4500,
    deposit: 9000,
    paymentFrequency: "MONTHLY",
    paymentDueDay: 10,
    signedAt: subMonths(now, 11),
  }})

  // ─── PAYMENTS (6 months history) ─────────────────────────────────────────
  async function addPayments(contractId: string, amount: number, months: number) {
    for (let i = months - 1; i >= 0; i--) {
      await prisma.payment.create({ data: {
        organizationId: org.id,
        contractId,
        amount,
        paymentDate: subMonths(now, i),
        method: i % 3 === 0 ? "TRANSFER" : "CHECK",
        reference: `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      }})
    }
  }

  await addPayments(contractActive1.id, 12000, 6)
  await addPayments(contractActive2.id, 5500, 3)
  await addPayments(contractActive3.id, 6000, 6)
  await addPayments(contractExpiring.id, 4500, 5)

  // ─── INVOICES ─────────────────────────────────────────────────────────────
  await prisma.invoice.createMany({ data: [
    {
      organizationId: org.id, contractId: contractActive1.id,
      number: "F-2025-0001", status: "PAID",
      issueDate: subMonths(now, 1), dueDate: subMonths(now, 1),
      subtotal: 12000, total: 12000, paidAmount: 12000, balance: 0,
    },
    {
      organizationId: org.id, contractId: contractActive2.id,
      number: "F-2025-0002", status: "PENDING",
      issueDate: now, dueDate: addDays(now, 10),
      subtotal: 5500, total: 5500, paidAmount: 0, balance: 5500,
    },
    {
      organizationId: org.id, contractId: contractActive3.id,
      number: "F-2025-0003", status: "OVERDUE",
      issueDate: subMonths(now, 2), dueDate: subMonths(now, 1),
      subtotal: 6000, total: 6000, paidAmount: 0, balance: 6000,
    },
  ]})

  // ─── EXPENSES ─────────────────────────────────────────────────────────────
  const expenseData = [
    { category: "MAINTENANCE", amount: 3500, description: "Reparacion bomba de agua", propertyId: propCayala.id, date: subMonths(now, 2) },
    { category: "CLEANING", amount: 800, description: "Limpieza profunda post-inquilino", propertyId: propMonterrico.id, date: subMonths(now, 1) },
    { category: "TAXES", amount: 2200, description: "IUSI primer semestre", propertyId: propOficina.id, date: subMonths(now, 3) },
    { category: "INSURANCE", amount: 4500, description: "Seguro anual propiedades", propertyId: propCayala.id, date: subMonths(now, 4) },
    { category: "UTILITIES", amount: 1200, description: "Agua y luz", propertyId: propBodega.id, date: subMonths(now, 1) },
    { category: "MAINTENANCE", amount: 5000, description: "Pintura exterior", propertyId: propMonterrico.id, date: subMonths(now, 5) },
    { category: "MAINTENANCE", amount: 1800, description: "Cambio de cerraduras", propertyId: propApartamento.id, date: subMonths(now, 2) },
    { category: "ADMIN", amount: 600, description: "Honorarios gestion mensual", date: now },
  ]
  for (const e of expenseData) {
    await prisma.expense.create({ data: { organizationId: org.id, currency: "GTQ", ...e } })
  }

  // ─── MAINTENANCE TICKETS ──────────────────────────────────────────────────
  const tickets = [
    { category: "PLUMBING", priority: "URGENT", title: "Fuga en tubo principal cocina", status: "IN_PROGRESS", propertyId: propCayala.id, reportedBy: "Ana Lopez", startedAt: subMonths(now, 0.1) },
    { category: "ELECTRICAL", priority: "HIGH", title: "Corto circuito en panel", status: "ASSIGNED", propertyId: propApartamento.id },
    { category: "HVAC", priority: "MEDIUM", title: "Aire acondicionado no enfria", status: "REPORTED", propertyId: propOficina.id, reportedBy: "Soluciones GT" },
    { category: "PAINTING", priority: "LOW", title: "Pintura descascarada sala", status: "REPORTED", propertyId: propMonterrico.id },
    { category: "STRUCTURAL", priority: "HIGH", title: "Grieta en pared este", status: "COMPLETED", propertyId: propBodega.id, completedAt: subMonths(now, 1), actualCost: 8500 },
    { category: "CLEANING", priority: "LOW", title: "Limpieza de cisternas", status: "COMPLETED", propertyId: propCayala.id, completedAt: subMonths(now, 2), actualCost: 1200 },
    { category: "SECURITY", priority: "MEDIUM", title: "Camara de seguridad danada", status: "REPORTED", propertyId: propOficina.id },
    { category: "APPLIANCE", priority: "MEDIUM", title: "Lavadora averiada", status: "ASSIGNED", propertyId: propApartamento.id, reportedBy: "Roberto Castillo" },
  ]
  for (let i = 0; i < tickets.length; i++) {
    const t = tickets[i]
    await prisma.maintenanceRequest.create({ data: {
      organizationId: org.id,
      ticketNumber: `M-${now.getFullYear()}-${String(i + 1).padStart(4, "0")}`,
      description: `Descripcion detallada: ${t.title}`,
      estimatedCost: Math.floor(Math.random() * 5000) + 500,
      reportedAt: subMonths(now, Math.random() * 2),
      assignedAt: t.status !== "REPORTED" ? subMonths(now, 0.5) : null,
      ...t,
    }})
  }

  // ─── ASSETS ─────────────────────────────────────────────────────────────
  const acMonterrico1 = await prisma.asset.create({ data: {
    organizationId: org.id, propertyId: propMonterrico.id,
    category: "HVAC", name: "Aire Acondicionado LG 24k BTU - Sala",
    brand: "LG", model: "LW2416HR", serialNumber: "LG-2021-001",
    purchaseDate: subMonths(now, 36), purchaseCost: 8500, currentValue: 6000,
    warranty: addMonths(now, 12), status: "ACTIVE", location: "Sala principal",
  }})

  const acMonterrico2 = await prisma.asset.create({ data: {
    organizationId: org.id, propertyId: propMonterrico.id,
    category: "HVAC", name: "Aire Acondicionado Samsung - Master",
    brand: "Samsung", model: "AR12TXEZBWK",
    purchaseDate: subMonths(now, 24), purchaseCost: 9200, currentValue: 7500,
    warranty: addMonths(now, 24), status: "ACTIVE", location: "Habitacion principal",
  }})

  const lancha1 = await prisma.asset.create({ data: {
    organizationId: org.id, propertyId: propMonterrico.id,
    category: "VEHICLE", name: "Lancha Yamaha 150 HP",
    brand: "Yamaha", model: "F150LCA", serialNumber: "YM-2022-456",
    purchaseDate: subMonths(now, 18), purchaseCost: 185000, currentValue: 150000,
    status: "ACTIVE", location: "Muelle Monterrico",
  }})

  const lancha2 = await prisma.asset.create({ data: {
    organizationId: org.id, propertyId: propMonterrico.id,
    category: "VEHICLE", name: "Lancha Panga 75 HP",
    brand: "Mercury", model: "75ELH",
    purchaseDate: subMonths(now, 48), purchaseCost: 85000, currentValue: 55000,
    status: "ACTIVE", location: "Muelle Monterrico",
  }})

  const motoAcuatica = await prisma.asset.create({ data: {
    organizationId: org.id, propertyId: propMonterrico.id,
    category: "VEHICLE", name: "Jet Ski Sea-Doo RXT",
    brand: "Sea-Doo", model: "RXT 300", serialNumber: "SD-2023-789",
    purchaseDate: subMonths(now, 12), purchaseCost: 120000, currentValue: 105000,
    warranty: addMonths(now, 24), status: "ACTIVE", location: "Muelle Monterrico",
  }})

  // Add service logs to assets
  await prisma.assetServiceLog.create({ data: {
    assetId: acMonterrico1.id, serviceType: "Mantenimiento preventivo",
    date: subMonths(now, 3), cost: 850, performedBy: "TecnoClima GT",
    nextServiceAt: addMonths(now, 3), notes: "Limpieza filtros, recarga gas",
  }})

  await prisma.assetServiceLog.create({ data: {
    assetId: lancha1.id, serviceType: "Service anual motor",
    date: subMonths(now, 6), cost: 5500, performedBy: "Marina Monterrico",
    nextServiceAt: addMonths(now, 6), notes: "Cambio aceite, bujias, filtros",
  }})

  await prisma.assetServiceLog.create({ data: {
    assetId: motoAcuatica.id, serviceType: "Revision tecnica",
    date: subMonths(now, 4), cost: 2200, performedBy: "Sea-Doo Guatemala",
    nextServiceAt: addDays(now, 20), notes: "Bajo garantia",
  }})

  // ─── EMPLOYEES ────────────────────────────────────────────────────────────
  const emp1 = await prisma.employee.create({ data: {
    organizationId: org.id,
    fullName: "Juan Pedro Cifuentes", documentNumber: "1234567890123",
    position: "Jardinero / Mantenimiento", phone: "5544-3322",
    hireDate: subMonths(now, 24), status: "ACTIVE", payPeriod: "BIWEEKLY", payRate: 2500,
  }})

  const emp2 = await prisma.employee.create({ data: {
    organizationId: org.id,
    fullName: "Rosa Elvira Tahay", documentNumber: "9876543210987",
    position: "Asistente administrativa", phone: "5566-7788", email: "r.tahay@demo.gt",
    hireDate: subMonths(now, 12), status: "ACTIVE", payPeriod: "MONTHLY", payRate: 4500,
  }})

  const emp3 = await prisma.employee.create({ data: {
    organizationId: org.id,
    fullName: "Carlos Batz Choc", documentNumber: "4567890123456",
    position: "Guarda de seguridad", phone: "5500-9900",
    hireDate: subMonths(now, 36), status: "ACTIVE", payPeriod: "MONTHLY", payRate: 3200,
  }})

  // ─── VENDORS ─────────────────────────────────────────────────────────────
  const vendorPlomero = await prisma.vendor.create({ data: {
    organizationId: org.id,
    name: "Plomeria Express GT", type: "COMPANY", category: "PLUMBING",
    taxId: "1234567-8", contactName: "Ing. Manuel Roca",
    phone: "2234-5678", email: "info@plomeriaexpress.gt",
    rating: 4.5, isActive: true,
  }})

  const vendorElectrico = await prisma.vendor.create({ data: {
    organizationId: org.id,
    name: "Electrica Total S.A.", type: "COMPANY", category: "ELECTRICAL",
    contactName: "Luis Barrios", phone: "2245-6789",
    rating: 4.0, isActive: true,
  }})

  const vendorPintura = await prisma.vendor.create({ data: {
    organizationId: org.id,
    name: "Pinturas Guatemala", type: "COMPANY", category: "PAINTING",
    contactName: "Pedro Pac", phone: "5567-8901",
    rating: 3.5, isActive: true,
  }})

  const vendorJardinero = await prisma.vendor.create({ data: {
    organizationId: org.id,
    name: "Jardines del Sur", type: "COMPANY", category: "LANDSCAPING",
    contactName: "Ana Pop", phone: "5512-3456",
    rating: 5.0, isActive: true,
  }})

  const vendorClimatizacion = await prisma.vendor.create({ data: {
    organizationId: org.id,
    name: "TecnoClima GT", type: "COMPANY", category: "HVAC",
    taxId: "9876543-2", contactName: "Ing. Roberto Sun",
    phone: "2268-9900", email: "ventas@tecnoclima.gt",
    rating: 4.8, isActive: true,
  }})

  const vendorConstruccion = await prisma.vendor.create({ data: {
    organizationId: org.id,
    name: "Constructora Altiplano", type: "COMPANY", category: "CONSTRUCTION",
    taxId: "5678901-2", contactName: "Arq. Sofia Mendez",
    phone: "2290-1234", email: "proyectos@altiplano.gt",
    rating: 4.2, isActive: true,
  }})

  // ─── PROJECTS ─────────────────────────────────────────────────────────────
  const project1 = await prisma.project.create({ data: {
    organizationId: org.id, propertyId: propMonterrico.id,
    type: "RENOVATION", name: "Remodelacion cocina Monterrico",
    status: "IN_PROGRESS", budgetTotal: 85000, budgetSpent: 42000,
    progressPercent: 50, startDate: subMonths(now, 2), endDate: addMonths(now, 1),
    description: "Remodelacion completa de cocina incluyendo granito, gabinetes y electrodomesticos nuevos",
  }})

  await prisma.projectTask.createMany({ data: [
    { projectId: project1.id, name: "Demolicion cocina vieja", status: "DONE", completedAt: subMonths(now, 1.5), orderIndex: 0 },
    { projectId: project1.id, name: "Instalacion plomeria nueva", status: "DONE", completedAt: subMonths(now, 1), orderIndex: 1 },
    { projectId: project1.id, name: "Instalacion gabinetes", status: "TODO", orderIndex: 2 },
    { projectId: project1.id, name: "Instalacion granito", status: "TODO", orderIndex: 3 },
    { projectId: project1.id, name: "Pintura y acabados", status: "TODO", orderIndex: 4 },
  ]})

  await prisma.projectCost.createMany({ data: [
    { projectId: project1.id, type: "MATERIAL", description: "Granito importado", amount: 18000, date: subMonths(now, 1.5) },
    { projectId: project1.id, type: "LABOR", description: "Demolicion y albañileria", amount: 12000, date: subMonths(now, 1.8) },
    { projectId: project1.id, type: "MATERIAL", description: "Gabinetes de madera", amount: 12000, date: subMonths(now, 0.5) },
  ]})

  const project2 = await prisma.project.create({ data: {
    organizationId: org.id, propertyId: propBodega.id,
    type: "CONSTRUCTION", name: "Impermeabilizacion techo bodega",
    status: "PLANNING", budgetTotal: 35000, budgetSpent: 0,
    progressPercent: 0, startDate: addDays(now, 15),
    description: "Impermeabilizacion total del techo de la bodega + instalacion de canales",
  }})

  await prisma.projectTask.createMany({ data: [
    { projectId: project2.id, name: "Cotizacion y seleccion de proveedor", status: "DONE", completedAt: now, orderIndex: 0 },
    { projectId: project2.id, name: "Limpieza y preparacion superficie", status: "TODO", orderIndex: 1 },
    { projectId: project2.id, name: "Aplicacion impermeabilizante", status: "TODO", orderIndex: 2 },
    { projectId: project2.id, name: "Instalacion canales", status: "TODO", orderIndex: 3 },
  ]})

  // ─── QUOTES ──────────────────────────────────────────────────────────────
  const quote1 = await prisma.quote.create({ data: {
    organizationId: org.id, vendorId: vendorClimatizacion.id, projectId: project1.id,
    quoteNumber: "COT-2025-0001", date: subMonths(now, 2),
    validUntil: addMonths(now, 1), subtotal: 15000, taxAmount: 1800, total: 16800,
    status: "APPROVED", approvedAt: subMonths(now, 1.8),
    notes: "Incluye instalacion de 2 minisplits",
  }})

  await prisma.quoteItem.createMany({ data: [
    { quoteId: quote1.id, description: "Minisplit Samsung 24k BTU", quantity: 2, unit: "und", unitPrice: 6500, total: 13000 },
    { quoteId: quote1.id, description: "Instalacion y mano de obra", quantity: 1, unit: "servicio", unitPrice: 2000, total: 2000 },
  ]})

  const quote2 = await prisma.quote.create({ data: {
    organizationId: org.id, vendorId: vendorConstruccion.id, projectId: project2.id,
    quoteNumber: "COT-2025-0002", date: subMonths(now, 0.5),
    validUntil: addMonths(now, 2), subtotal: 30000, taxAmount: 3600, total: 33600,
    status: "PENDING",
    notes: "Propuesta para impermeabilizacion techo 500m2",
  }})

  await prisma.quoteItem.createMany({ data: [
    { quoteId: quote2.id, description: "Impermeabilizante epoxido", quantity: 50, unit: "gal", unitPrice: 350, total: 17500 },
    { quoteId: quote2.id, description: "Mano de obra", quantity: 500, unit: "m2", unitPrice: 25, total: 12500 },
  ]})

  const quote3 = await prisma.quote.create({ data: {
    organizationId: org.id, vendorId: vendorPlomero.id,
    quoteNumber: "COT-2025-0003", date: subMonths(now, 0.2),
    validUntil: addDays(now, 30), subtotal: 8500, taxAmount: 1020, total: 9520,
    status: "PENDING",
    notes: "Reparacion fuga + cambio tuberias cocina casa Cayala",
  }})

  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────
  await prisma.notification.createMany({ data: [
    {
      organizationId: org.id, userId: admin.id,
      type: "CONTRACT_EXPIRING", isRead: false,
      title: "Contrato por vencer",
      message: "Contrato de Maria Fernanda Gomez en Bodega Mixco vence en 20 dias",
      link: `/contratos/${contractExpiring.id}`,
    },
    {
      organizationId: org.id, userId: admin.id,
      type: "TICKET_URGENT", isRead: false,
      title: "Ticket urgente",
      message: "Fuga en tubo principal cocina en Casa Cayala",
      link: "/mantenimiento",
    },
    {
      organizationId: org.id, userId: admin.id,
      type: "ASSET_SERVICE_DUE", isRead: true,
      title: "Servicio de activo proximo",
      message: "Jet Ski Sea-Doo RXT requiere servicio en 20 dias",
      link: `/activos/${motoAcuatica.id}`,
    },
  ]})

  console.log("\n✓ Seed completado exitosamente.")
  console.log("  Login: demo@inmobiliaria.gt / demo1234")
  console.log(`  Propiedades: 5, Inquilinos: 4, Contratos: 4, Activos: 5`)
  console.log(`  Empleados: 3, Proveedores: 6, Tickets: 8, Proyectos: 2\n`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
