import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { formatGTQ, formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return new NextResponse("No autenticado", { status: 401 })
  const orgId = session.user.organizationId
  const { id } = await ctx.params

  const acceptance = await prisma.serviceAcceptance.findFirst({
    where: { id, organizationId: orgId },
    include: {
      organization: true,
      requestedBy: { select: { name: true } },
      acceptedBy: { select: { name: true } },
      photos: true,
    },
  })
  if (!acceptance) return new NextResponse("No encontrado", { status: 404 })
  if (acceptance.status !== "ACCEPTED") return new NextResponse("Aceptación no finalizada", { status: 400 })

  let entityName = "Servicio"
  let vendorName = "—"
  let projectName: string | null = null
  let propertyName: string | null = null
  let amountApproved: number | null = null
  if (acceptance.entityType === "PARTIDA") {
    const p = await prisma.projectPartida.findUnique({
      where: { id: acceptance.entityId },
      include: { project: { include: { property: true } }, vendor: true },
    })
    if (p) {
      entityName = p.name
      vendorName = p.vendor?.name ?? "—"
      projectName = p.project?.name ?? null
      propertyName = p.project?.property?.name ?? null
      amountApproved = p.amountApproved
    }
  } else {
    const t = await prisma.maintenanceRequest.findUnique({
      where: { id: acceptance.entityId },
      include: { property: true, vendor: true },
    })
    if (t) {
      entityName = `${t.ticketNumber} — ${t.title}`
      vendorName = t.vendor?.name ?? "—"
      propertyName = t.property?.name ?? null
      amountApproved = t.totalAmount
    }
  }

  const checklist: { key: string; checked: boolean }[] = acceptance.checklist
    ? (() => { try { return JSON.parse(acceptance.checklist!) } catch { return [] } })()
    : []

  const acceptedAt = acceptance.acceptedAt ?? new Date()
  const time = new Intl.DateTimeFormat("es-GT", { hour: "2-digit", minute: "2-digit" }).format(acceptedAt)

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Acta de Aceptación — ${escapeHtml(entityName)}</title>
<style>
  @page { size: letter; margin: 22mm 18mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; font-size: 11pt; line-height: 1.45; }
  h1 { font-size: 18pt; margin: 0 0 4px; letter-spacing: -0.5px; }
  h2 { font-size: 12pt; margin: 20px 0 6px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; text-transform: uppercase; letter-spacing: 1px; color: #374151; }
  .org { font-size: 10pt; color: #6b7280; margin-bottom: 24px; }
  .label { color: #6b7280; font-size: 9.5pt; }
  .val { font-weight: 500; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th, td { text-align: left; padding: 4px 6px; border-bottom: 1px solid #f3f4f6; font-size: 10pt; }
  th { background: #f9fafb; color: #6b7280; font-weight: 600; }
  .check { color: #059669; font-weight: 600; }
  .signature { margin-top: 36px; padding: 18px; border: 2px solid #059669; border-radius: 6px; background: #ecfdf5; }
  .rating { letter-spacing: 4px; color: #f59e0b; font-size: 14pt; }
  .hash { font-family: ui-monospace, SFMono-Regular, Monaco, Consolas, monospace; font-size: 7pt; color: #6b7280; word-break: break-all; margin-top: 22px; padding: 8px; background: #f9fafb; border-radius: 4px; }
  .clause { font-size: 8.5pt; color: #6b7280; margin-top: 12px; padding: 10px; background: #f9fafb; border-radius: 4px; line-height: 1.5; }
  .photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 8px; }
  .photo { aspect-ratio: 1; background: #f3f4f6; border: 1px dashed #d1d5db; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 8pt; color: #6b7280; padding: 6px; text-align: center; }
  .footer { margin-top: 24px; text-align: center; color: #9ca3af; font-size: 8pt; padding-top: 8px; border-top: 1px solid #e5e7eb; }
  @media print { .no-print { display: none; } }
  .print-btn { position: fixed; top: 12px; right: 12px; padding: 8px 14px; background: #111; color: #fff; border: 0; border-radius: 6px; cursor: pointer; font-size: 11pt; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">Imprimir / Guardar PDF</button>

<h1>Acta de Aceptación de Servicio</h1>
<div class="org">${escapeHtml(acceptance.organization.name)}${acceptance.organization.taxId ? ` · NIT ${escapeHtml(acceptance.organization.taxId)}` : ""}</div>

<h2>Identificación del servicio</h2>
<div class="grid">
  <div><span class="label">Servicio</span><br/><span class="val">${escapeHtml(entityName)}</span></div>
  <div><span class="label">Proveedor</span><br/><span class="val">${escapeHtml(vendorName)}</span></div>
  <div><span class="label">${acceptance.entityType === "PARTIDA" ? "Proyecto" : "Propiedad"}</span><br/><span class="val">${escapeHtml(projectName ?? propertyName ?? "—")}</span></div>
  <div><span class="label">Monto comprometido</span><br/><span class="val">${amountApproved != null ? escapeHtml(formatGTQ(amountApproved)) : "—"}</span></div>
  <div><span class="label">Tipo</span><br/><span class="val">${acceptance.entityType === "PARTIDA" ? "Partida de proyecto" : "Ticket de mantenimiento"}</span></div>
  <div><span class="label">Solicitada por</span><br/><span class="val">${escapeHtml(acceptance.requestedBy?.name ?? "—")}</span></div>
</div>

<h2>Lista de verificación</h2>
<table>
  <thead><tr><th>Punto verificado</th><th style="width:80px;text-align:right">Resultado</th></tr></thead>
  <tbody>
    ${checklist.map(c => `<tr>
      <td>${escapeHtml(formatCheckLabel(c.key))}</td>
      <td style="text-align:right" class="check">${c.checked ? "✓ Conforme" : "✗ No conforme"}</td>
    </tr>`).join("")}
  </tbody>
</table>

<h2>Calificación del proveedor</h2>
<div class="rating">${"★".repeat(acceptance.rating ?? 0)}${"☆".repeat(5 - (acceptance.rating ?? 0))}</div>
<div class="label">${acceptance.rating ?? 0} de 5 estrellas</div>

${acceptance.notes ? `<h2>Notas del aceptador</h2><p>${escapeHtml(acceptance.notes)}</p>` : ""}

${acceptance.photos.length > 0 ? `
<h2>Evidencia fotográfica (${acceptance.photos.length})</h2>
<div class="photos">
  ${acceptance.photos.map(ph => `<div class="photo">${escapeHtml(ph.caption ?? ph.url)}</div>`).join("")}
</div>` : ""}

<div class="signature">
  <div class="label" style="margin-bottom:4px;">FIRMA DIGITAL</div>
  <div style="font-size:13pt;">Aceptado por <strong>${escapeHtml(acceptance.acceptedBy?.name ?? "—")}</strong></div>
  <div style="margin-top:4px;">el ${escapeHtml(formatDate(acceptedAt))} a las ${time} (hora Guatemala)</div>
</div>

<div class="hash">
  <strong>Hash de verificación (SHA-256):</strong><br/>
  ${escapeHtml(acceptance.verificationHash ?? "")}
</div>

<div class="clause">
  Este documento certifica la aceptación formal del servicio referido. La firma digital del usuario aceptador
  combinada con el hash de verificación SHA-256 constituyen prueba irrefutable de su voluntad expresa
  de aceptar el servicio bajo los términos verificados en el checklist anterior. Cualquier alteración
  posterior de los datos invalidará el hash y por tanto el acta.
</div>

<div class="footer">
  Generado ${escapeHtml(formatDate(new Date()))} · Inmobiliaria Pro
</div>
</body></html>`

  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  })
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c))
}

function formatCheckLabel(key: string): string {
  const map: Record<string, string> = {
    completed_on_time: "Trabajo terminado en tiempo",
    quality_as_expected: "Calidad esperada",
    equipment_working: "Equipos funcionando",
    no_observations: "Sin observaciones pendientes",
    documentation_delivered: "Documentación / garantía entregada",
  }
  return map[key] ?? key
}
