import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PrintTrigger } from "./_print-trigger"

const TICKET_STATUS: Record<string, string> = {
  REPORTED: "Reportado", ASSIGNED: "Asignado", IN_PROGRESS: "En progreso",
  COMPLETED: "Completado", CANCELLED: "Cancelado",
}
const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Baja", MEDIUM: "Media", HIGH: "Alta", URGENT: "Urgente",
}
const CATEGORY_LABELS: Record<string, string> = {
  PLUMBING: "Plomería", ELECTRICAL: "Eléctrico", HVAC: "Climatización",
  PAINTING: "Pintura", STRUCTURAL: "Estructural", CLEANING: "Limpieza",
  APPLIANCES: "Electrodomésticos", SECURITY: "Seguridad", OTHER: "Otro",
}

function fmt(n: number) { return `Q${n.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function fmtDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d
  return date.toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" })
}

export default async function TicketPDFPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string
  const { id } = await params

  const ticket = await prisma.maintenanceRequest.findFirst({
    where: { id, organizationId: orgId },
    include: {
      property: true,
      assignedTo: { select: { name: true } },
      vendor: { select: { name: true, phone: true } },
      ticketQuotes: {
        include: { vendor: { select: { name: true } }, items: { orderBy: { orderIndex: "asc" } } },
        orderBy: { createdAt: "asc" },
      },
      ticketPayments: { orderBy: { date: "asc" } },
      timelineEvents: { orderBy: { createdAt: "asc" } },
      approvalRequest: {
        include: {
          requestedBy: { select: { name: true } },
          approvedBy: { select: { name: true } },
          rejectedBy: { select: { name: true } },
          cosigner: { select: { name: true } },
        },
      },
    },
  })
  if (!ticket) notFound()

  const totalPaid = ticket.ticketPayments.reduce((s, p) => s + p.amount, 0)
  const selectedQuote = ticket.ticketQuotes.find(q => q.status === "SELECTED")
  const totalRef = selectedQuote?.total ?? ticket.totalAmount

  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{ticket.ticketNumber} — {ticket.title}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1a1a1a; background: white; }
          @page { size: A4; margin: 18mm 16mm; }
          @media print { .no-print { display: none !important; } body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          .btn { display: inline-flex; align-items: center; gap: 6px; background: #0f172a; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 12px; cursor: pointer; margin-bottom: 24px; }
          h1 { font-size: 18pt; font-weight: 700; margin-bottom: 4px; }
          h2 { font-size: 12pt; font-weight: 600; margin: 18px 0 8px; padding-bottom: 4px; border-bottom: 1.5px solid #e2e8f0; color: #0f172a; }
          .meta { font-size: 9.5pt; color: #64748b; margin-bottom: 14px; }
          .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
          .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; padding: 8px 10px; }
          .info-label { font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; }
          .info-val { font-size: 10.5pt; font-weight: 600; color: #0f172a; margin-top: 2px; }
          .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
          .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; padding: 8px 10px; }
          .kpi-label { font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; }
          .kpi-val { font-size: 13pt; font-weight: 700; color: #0f172a; margin-top: 2px; }
          .kpi-val.green { color: #16a34a; }
          .kpi-val.red { color: #dc2626; }
          table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 10px; }
          th { background: #f1f5f9; text-align: left; padding: 6px 8px; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.04em; color: #475569; font-weight: 600; }
          td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
          tr:last-child td { border-bottom: none; }
          .badge { display: inline-block; padding: 2px 7px; border-radius: 100px; font-size: 8pt; font-weight: 600; }
          .badge-green { background: #dcfce7; color: #166534; }
          .badge-blue { background: #dbeafe; color: #1d4ed8; }
          .badge-amber { background: #fef3c7; color: #92400e; }
          .badge-gray { background: #f1f5f9; color: #475569; }
          .badge-red { background: #fee2e2; color: #991b1b; }
          .approval-box { padding: 10px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 9.5pt; }
          .timeline-row { display: flex; gap: 10px; padding: 5px 0; border-bottom: 1px solid #f8fafc; align-items: flex-start; font-size: 9.5pt; }
          .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 8pt; color: #94a3b8; display: flex; justify-content: space-between; }
        `}</style>
      </head>
      <body>
        <PrintTrigger />
        <div className="no-print" style={{ padding: "16px" }}>
          <button className="btn">⬇ Descargar / Imprimir PDF</button>
        </div>

        {/* Header */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1>{ticket.title}</h1>
              <p className="meta">
                {ticket.ticketNumber} · {ticket.property.name}
                {ticket.reportedAt && ` · Reportado: ${fmtDate(ticket.reportedAt)}`}
              </p>
            </div>
            <div style={{ textAlign: "right", fontSize: "9pt", color: "#64748b" }}>
              <p>Generado: {fmtDate(new Date())}</p>
              <p>Ticket de mantenimiento</p>
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div className="info-grid">
          <div className="info-box">
            <div className="info-label">Estado</div>
            <div className="info-val">
              <span className={`badge ${ticket.status === "COMPLETED" ? "badge-green" : ticket.status === "IN_PROGRESS" ? "badge-blue" : "badge-gray"}`}>
                {TICKET_STATUS[ticket.status] ?? ticket.status}
              </span>
            </div>
          </div>
          <div className="info-box">
            <div className="info-label">Prioridad</div>
            <div className="info-val">{PRIORITY_LABELS[ticket.priority] ?? ticket.priority}</div>
          </div>
          <div className="info-box">
            <div className="info-label">Categoría</div>
            <div className="info-val">{CATEGORY_LABELS[ticket.category] ?? ticket.category}</div>
          </div>
          {ticket.assignedTo && (
            <div className="info-box">
              <div className="info-label">Asignado a</div>
              <div className="info-val">{ticket.assignedTo.name}</div>
            </div>
          )}
          {ticket.vendor && (
            <div className="info-box">
              <div className="info-label">Proveedor</div>
              <div className="info-val">{ticket.vendor.name}</div>
            </div>
          )}
          {ticket.completedAt && (
            <div className="info-box">
              <div className="info-label">Completado</div>
              <div className="info-val">{fmtDate(ticket.completedAt)}</div>
            </div>
          )}
        </div>

        {ticket.description && (
          <div style={{ marginBottom: 14, fontSize: "10pt", color: "#374151", lineHeight: 1.5 }}>
            {ticket.description}
          </div>
        )}

        {/* Financial KPIs */}
        {(totalRef != null || totalPaid > 0) && (
          <div className="kpis">
            {totalRef != null && (
              <div className="kpi">
                <div className="kpi-label">Total cotizado</div>
                <div className="kpi-val">{fmt(totalRef)}</div>
              </div>
            )}
            <div className="kpi">
              <div className="kpi-label">Total pagado</div>
              <div className="kpi-val green">{fmt(totalPaid)}</div>
            </div>
            {totalRef != null && (
              <div className="kpi">
                <div className="kpi-label">Saldo pendiente</div>
                <div className={`kpi-val ${totalRef - totalPaid > 0 ? "red" : "green"}`}>
                  {fmt(Math.max(0, totalRef - totalPaid))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cotizaciones con rubros */}
        {ticket.ticketQuotes.length > 0 && (
          <>
            <h2>Cotizaciones</h2>
            {ticket.ticketQuotes.map(q => (
              <div key={q.id} style={{ marginBottom: 16, pageBreakInside: "avoid" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <div>
                    <strong>{q.vendor.name}</strong>
                    {q.vendorReference && <span style={{ color: "#64748b", marginLeft: 8 }}>Ref: {q.vendorReference}</span>}
                  </div>
                  <span className={`badge ${q.status === "SELECTED" ? "badge-green" : q.status === "REJECTED" ? "badge-red" : "badge-amber"}`}>
                    {q.status === "SELECTED" ? "Seleccionada" : q.status === "REJECTED" ? "Rechazada" : "Pendiente"}
                  </span>
                </div>
                {q.validUntil && <p style={{ fontSize: "9pt", color: "#64748b", marginBottom: 4 }}>Válida hasta {new Intl.DateTimeFormat("es-GT", { dateStyle: "medium" }).format(q.validUntil)}</p>}
                {q.items && q.items.length > 0 && (
                  <table>
                    <thead>
                      <tr>
                        <th>Descripción</th>
                        <th style={{ width: 60, textAlign: "right" }}>Cant.</th>
                        <th style={{ width: 70 }}>Unidad</th>
                        <th style={{ width: 90, textAlign: "right" }}>P. Unit.</th>
                        <th style={{ width: 90, textAlign: "right" }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {q.items.map(it => (
                        <tr key={it.id}>
                          <td>{it.description}</td>
                          <td style={{ textAlign: "right" }}>{it.quantity}</td>
                          <td>{it.unit ?? "—"}</td>
                          <td style={{ textAlign: "right" }}>{fmt(it.unitPrice)}</td>
                          <td style={{ textAlign: "right", fontWeight: 600 }}>{fmt(it.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr><td colSpan={4} style={{ textAlign: "right", color: "#64748b" }}>Subtotal</td><td style={{ textAlign: "right" }}>{fmt(q.subtotal)}</td></tr>
                      {q.taxAmount > 0 && <tr><td colSpan={4} style={{ textAlign: "right", color: "#64748b" }}>IVA {q.taxPercent ?? 12}%</td><td style={{ textAlign: "right" }}>{fmt(q.taxAmount)}</td></tr>}
                      <tr><td colSpan={4} style={{ textAlign: "right", fontWeight: 700 }}>Total</td><td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(q.total)}</td></tr>
                    </tfoot>
                  </table>
                )}
                {q.notes && <p style={{ fontSize: "9pt", color: "#64748b", marginTop: 4 }}>{q.notes}</p>}
              </div>
            ))}
          </>
        )}

        {/* Autorización */}
        {ticket.approvalRequest && (
          <>
            <h2>Autorización</h2>
            <div className="approval-box">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <strong>{ticket.approvalRequest.title}</strong>
                <span className={`badge ${ticket.approvalRequest.status === "APPROVED" ? "badge-green" : ticket.approvalRequest.status === "REJECTED" ? "badge-red" : "badge-amber"}`}>
                  {ticket.approvalRequest.status === "APPROVED" ? "Aprobada" : ticket.approvalRequest.status === "REJECTED" ? "Rechazada" : ticket.approvalRequest.status === "PENDING_COSIGN" ? "Pendiente co-firma" : "Pendiente"}
                </span>
              </div>
              <table style={{ marginBottom: 0 }}>
                <tbody>
                  <tr>
                    <td style={{ color: "#64748b", width: "30%" }}>Solicitado por</td>
                    <td>{ticket.approvalRequest.requestedBy.name}</td>
                    <td style={{ color: "#64748b" }}>Fecha solicitud</td>
                    <td>{fmtDate(ticket.approvalRequest.createdAt)}</td>
                  </tr>
                  {ticket.approvalRequest.approvedBy && (
                    <tr>
                      <td style={{ color: "#64748b" }}>Aprobado por</td>
                      <td>{ticket.approvalRequest.approvedBy.name}</td>
                      <td style={{ color: "#64748b" }}>Fecha aprobación</td>
                      <td>{ticket.approvalRequest.approvedAt ? fmtDate(ticket.approvalRequest.approvedAt) : "—"}</td>
                    </tr>
                  )}
                  {ticket.approvalRequest.cosigner && (
                    <tr>
                      <td style={{ color: "#64748b" }}>Co-firmado por</td>
                      <td>{ticket.approvalRequest.cosigner.name}</td>
                      <td style={{ color: "#64748b" }}>Fecha co-firma</td>
                      <td>{ticket.approvalRequest.cosignedAt ? fmtDate(ticket.approvalRequest.cosignedAt) : "—"}</td>
                    </tr>
                  )}
                  {ticket.approvalRequest.rejectedBy && (
                    <tr>
                      <td style={{ color: "#64748b" }}>Rechazado por</td>
                      <td>{ticket.approvalRequest.rejectedBy.name}</td>
                      <td style={{ color: "#64748b" }}>Motivo</td>
                      <td style={{ color: "#dc2626" }}>{ticket.approvalRequest.rejectionReason ?? "—"}</td>
                    </tr>
                  )}
                  {ticket.approvalRequest.amount && (
                    <tr>
                      <td style={{ color: "#64748b" }}>Monto autorizado</td>
                      <td style={{ fontWeight: 600 }}>{fmt(ticket.approvalRequest.amount)}</td>
                      <td></td><td></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagos */}
        {ticket.ticketPayments.length > 0 && (
          <>
            <h2>Pagos</h2>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Método</th>
                  <th>Referencia</th>
                  <th>%</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {ticket.ticketPayments.map(pay => (
                  <tr key={pay.id}>
                    <td>{fmtDate(pay.date)}</td>
                    <td>{pay.method}</td>
                    <td style={{ color: "#64748b" }}>{pay.reference ?? "—"}</td>
                    <td>{pay.percentageOfTotal != null ? `${pay.percentageOfTotal}%` : "—"}</td>
                    <td style={{ fontWeight: 600 }}>
                      {fmt(pay.amount)}
                      {pay.closesWithDiscount && pay.discountAmount && (
                        <span style={{ color: "#d97706", marginLeft: 4, fontSize: "8.5pt" }}>desc.{fmt(pay.discountAmount)}</span>
                      )}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: "#f8fafc" }}>
                  <td colSpan={4} style={{ fontWeight: 600 }}>Total pagado</td>
                  <td style={{ fontWeight: 700 }}>{fmt(totalPaid)}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        {/* Timeline */}
        {ticket.timelineEvents.length > 0 && (
          <>
            <h2>Audit trail</h2>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Descripción</th>
                </tr>
              </thead>
              <tbody>
                {ticket.timelineEvents.map(ev => (
                  <tr key={ev.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtDate(ev.createdAt)}</td>
                    <td style={{ color: "#64748b" }}>{ev.type}</td>
                    <td>{ev.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {ticket.resolutionNotes && (
          <>
            <h2>Notas de resolución</h2>
            <p style={{ fontSize: "10pt", lineHeight: 1.5 }}>{ticket.resolutionNotes}</p>
          </>
        )}

        <div className="footer">
          <span>TU PROPIEDAD — Sistema de Gestión Inmobiliaria</span>
          <span>Generado el {fmtDate(new Date())}</span>
        </div>
      </body>
    </html>
  )
}
