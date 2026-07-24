import { redirect, notFound } from "next/navigation"
import type { ReactNode } from "react"
import {
  Bed, Bath, Car, Building2, LandPlot, Layers, MoveHorizontal, MoveVertical,
  Truck, Briefcase, ArrowUpDown, PackageOpen, Store, Factory, Route,
} from "lucide-react"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/permissions"
import { toVaras2, v2ToM2, convertCurrency, type AreaUnit } from "@/lib/varas"
import { PROPERTY_TYPES } from "@/lib/schemas/property"
import { categoryLabel } from "@/lib/acquisition-categories"
import { isValidPolygon, type LatLng } from "@/lib/geo"
import { AcqMap, type AcqMapItem } from "@/app/(app)/adquisiciones/mapa/_map"
import { PrintButton } from "./_print-btn"

export const dynamic = "force-dynamic"

const UNIT_LABEL: Record<string, string> = {
  V2: "v²", M2: "m²", CUERDA: "cuerdas", MANZANA: "manzanas", HECTAREA: "ha", CABALLERIA: "caballerías",
}

export default async function FichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session) redirect("/login")
  const me = session.user.organizationId
  const user = { id: session.user.id, role: session.user.role, organizationId: me }
  if (!can(user, "adquisiciones", "view")) redirect("/dashboard")

  const c = await prisma.acquisitionCandidate.findFirst({
    where: { id, OR: [{ organizationId: me }, { link: { intermediaryOrgId: me } }] },
    include: { organization: { select: { name: true } } },
  })
  if (!c) notFound()

  const settings = await prisma.organizationSettings.findUnique({ where: { organizationId: me }, select: { fxUsdGtq: true } })
  const fx = settings?.fxUsdGtq ?? 7.5
  const inQ = (n: number | null) => n == null ? null : convertCurrency(n, c.currency, "GTQ", fx)
  const inUSD = (n: number | null) => n == null ? null : convertCurrency(n, c.currency, "USD", fx)
  const fQ = (n: number | null) => n == null ? "—" : `Q ${n.toLocaleString("es-GT", { maximumFractionDigits: 0 })}`
  const fUSD = (n: number | null) => n == null ? "—" : `$ ${n.toLocaleString("es-GT", { maximumFractionDigits: 0 })}`
  const nf = (n: number, d = 0) => n.toLocaleString("es-GT", { minimumFractionDigits: 0, maximumFractionDigits: d })

  const areaV2 = toVaras2(c.area, c.areaUnit as AreaUnit | null, c.cuerdaVaras)
  const areaM2 = v2ToM2(areaV2)
  const pricePerV2 = c.price != null && areaV2 ? c.price / areaV2 : null
  const pricePerM2 = c.price != null && areaM2 ? c.price / areaM2 : null
  const refAvg = c.refPriceMinV2 != null && c.refPriceMaxV2 != null ? (c.refPriceMinV2 + c.refPriceMaxV2) / 2 : null
  const deviation = pricePerV2 != null && refAvg ? ((pricePerV2 - refAvg) / refAvg) * 100 : null
  const offerTotal = c.offerPerV2 != null && areaV2 ? c.offerPerV2 * areaV2 : null
  const loc = [c.zone, c.city, c.department].filter(Boolean).join(", ")

  // Derivados
  const built = c.builtArea
  const ratio = built != null && areaM2 ? built / areaM2 : null
  const mz = areaV2 != null && areaV2 >= 10000 ? areaV2 / 10000 : null
  const depthEstimated = c.depthM == null && c.frontM != null && c.frontM > 0 && areaM2 != null
  const depth = c.depthM != null ? c.depthM : (depthEstimated ? areaM2! / c.frontM! : null)

  const mapItems: AcqMapItem[] = (c.latitude != null && c.longitude != null) ? [{
    id: c.id, title: c.title, stage: c.stage, price: c.price, currency: c.currency,
    lat: c.latitude, lng: c.longitude,
    polygon: isValidPolygon(c.mapPolygon) ? (c.mapPolygon as LatLng[]) : null,
  }] : []

  const devTone = deviation == null ? "#6B7280" : deviation > 5 ? "#A8423F" : deviation < -5 ? "#2C6B43" : "#12182A"
  const iconSize = 16

  // ── BLOQUE A: chips (array filtrado, sin huecos) ──
  const chips: { icon: ReactNode; value: string; label: string }[] = []
  const chip = (cond: unknown, icon: ReactNode, value: string, label: string) => { if (cond) chips.push({ icon, value, label }) }
  chip(areaV2 != null, <LandPlot size={iconSize} strokeWidth={1.5} />, `${nf(areaV2!)} v²`, `Terreno · ${nf(areaM2!)} m²`)
  chip(built != null, <Building2 size={iconSize} strokeWidth={1.5} />, `${nf(built!)} m²`, "Construcción")
  chip(ratio != null, <Layers size={iconSize} strokeWidth={1.5} />, `${ratio!.toFixed(2)}×`, "Construcción / terreno")
  chip(c.frontM != null, <MoveHorizontal size={iconSize} strokeWidth={1.5} />, `${nf(c.frontM!, 2)} m`, "Frente")
  chip(depth != null, <MoveVertical size={iconSize} strokeWidth={1.5} />, `${nf(depth!, 2)} m`, depthEstimated ? "Fondo (estimado)" : "Fondo")
  chip(c.maneuveringYardM2 != null, <Truck size={iconSize} strokeWidth={1.5} />, `${nf(c.maneuveringYardM2!)} m²`, "Patio de maniobra")
  chip(c.officeMezzanineM2 != null, <Briefcase size={iconSize} strokeWidth={1.5} />, `${nf(c.officeMezzanineM2!)} m²`, "Oficina / mezanine")
  chip(c.clearHeightM != null, <ArrowUpDown size={iconSize} strokeWidth={1.5} />, `${nf(c.clearHeightM!, 2)} m`, "Altura libre")
  chip(c.loadingDocks != null && c.loadingDocks > 0, <PackageOpen size={iconSize} strokeWidth={1.5} />, String(c.loadingDocks), "Andenes de carga")
  chip(c.parkingSpaces != null && c.parkingSpaces > 0, <Car size={iconSize} strokeWidth={1.5} />, String(c.parkingSpaces), "Parqueos")
  chip(c.bedrooms != null && c.bedrooms > 0, <Bed size={iconSize} strokeWidth={1.5} />, String(c.bedrooms), "Habitaciones")
  chip(c.bathrooms != null && c.bathrooms > 0, <Bath size={iconSize} strokeWidth={1.5} />, String(c.bathrooms), "Baños")
  chip(c.isCommercial, <Store size={iconSize} strokeWidth={1.5} />, "Sí", "Propiedad comercial")
  chip(c.isIndustrial, <Factory size={iconSize} strokeWidth={1.5} />, "Sí", "Propiedad industrial")
  chip(c.pavedAccess != null, <Route size={iconSize} strokeWidth={1.5} />, c.pavedAccess ? "Sí" : "No", "Acceso pavimentado")

  // ── BLOQUE B: tabla Resumen ──
  const rows: [string, string][] = []
  const row = (label: string, value: string | null | undefined) => { if (value) rows.push([label, value]) }
  const code = `NOC-${c.id.slice(-6).toUpperCase()}`
  const terreno = areaV2 != null
    ? `${nf(areaV2)} v² · ${nf(areaM2!)} m²` + (mz ? ` · ${mz.toFixed(2)} mz` : "")
    : null
  const cuerdaLado = c.areaUnit === "CUERDA" ? c.cuerdaVaras : null
  const declarada = c.area != null && c.areaUnit && c.areaUnit !== "V2" && c.areaUnit !== "M2"
    ? `${nf(c.area, 2)} ${UNIT_LABEL[c.areaUnit] ?? c.areaUnit}` +
      (c.areaUnit === "CUERDA" ? ` de ${cuerdaLado ?? 25}×${cuerdaLado ?? 25} v${cuerdaLado ? "" : " (asumido)"}` : "")
    : null
  row("Código", code)
  row("Tipo de inmueble", c.propertyType ? (PROPERTY_TYPES[c.propertyType] ?? c.propertyType) : null)
  row("Departamento", c.department)
  row("Ciudad / municipio", c.city)
  row("Zona / sector", c.zone)
  row("Dirección", c.addressLine)
  row("Terreno", terreno)
  row("Área declarada", declarada)
  row("Construcción", built != null ? `${nf(built)} m²` : null)
  row("Uso de suelo (POT)", c.landUse)
  row("Frente / fondo", c.frontM != null ? `${nf(c.frontM, 2)} m × ${depth != null ? nf(depth, 2) + " m" : "s/d"}${depthEstimated ? " (est.)" : ""}` : null)
  row("Patio de maniobra", c.maneuveringYardM2 != null ? `${nf(c.maneuveringYardM2)} m²` : null)
  row("Oficina / mezanine", c.officeMezzanineM2 != null ? `${nf(c.officeMezzanineM2)} m²` : null)
  row("Altura libre", c.clearHeightM != null ? `${nf(c.clearHeightM, 2)} m` : null)
  row("Acceso pavimentado", c.pavedAccess == null ? null : c.pavedAccess ? "Sí" : "No")
  row("Propiedad comercial", c.isCommercial ? "Sí" : null)
  row("Propiedad industrial", c.isIndustrial ? "Sí" : null)
  row("Catastro (RIC)", c.cadastralNumber)
  row("Polígono catastral", isValidPolygon(c.mapPolygon) ? "Dibujado" : null)
  row("Etiquetas", c.categories.length ? c.categories.map(categoryLabel).join(" · ") : null)
  row("Fecha de captura", c.createdAt.toLocaleDateString("es-GT"))

  const cuerdaWarning = c.areaUnit === "CUERDA" && c.cuerdaVaras == null
  const locationWarning = !c.cadastralNumber && !isValidPolygon(c.mapPolygon)

  return (
    <div style={{ background: "#F6F7F9", minHeight: "100vh" }}>
      <style>{`
        @page { size: A4; margin: 12mm; }
        .avoid-break { break-inside: avoid; page-break-inside: avoid; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .sheet { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; border-radius: 0 !important; }
          .chips   { grid-template-columns: repeat(4, 1fr) !important; }
          .summary { grid-template-columns: repeat(2, 1fr) !important; }
          img { break-inside: avoid; }
        }
        @media (max-width: 560px) {
          .chips   { grid-template-columns: repeat(2, 1fr) !important; }
          .summary { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Barra de acciones (no imprime) */}
      <div className="no-print" style={{ position: "sticky", top: 0, zIndex: 10, background: "#0D1322", color: "#F4EFE6", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <a href={`/adquisiciones/${c.id}`} style={{ color: "#C9C6BC", fontSize: 13, textDecoration: "none" }}>← Volver al análisis</a>
        <PrintButton />
      </div>

      <div className="sheet" style={{ maxWidth: 820, margin: "20px auto", background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 10px 40px rgba(18,24,42,.10)" }}>
        {/* Encabezado marca */}
        <div style={{ background: "#0D1322", color: "#F4EFE6", padding: "22px 28px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 22, letterSpacing: ".12em" }}>NOCTUA</div>
            <div style={{ fontSize: 11, letterSpacing: ".2em", color: "#C9A24B", textTransform: "uppercase" }}>Análisis de adquisición</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 11, opacity: .8 }}>
            {c.organization.name}<br />{code}
          </div>
        </div>

        <div style={{ padding: "24px 28px" }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 26, color: "#12182A", margin: 0 }}>{c.title}</h1>
          {loc && <div style={{ color: "#6B7280", fontSize: 14, marginTop: 4 }}>📍 {loc}</div>}
          {c.categories.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {c.categories.map(cat => (
                <span key={cat} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 999, background: "rgba(138,106,46,.10)", color: "#8A6A2E", border: "1px solid rgba(138,106,46,.25)" }}>
                  {categoryLabel(cat)}
                </span>
              ))}
            </div>
          )}

          {/* Fotos */}
          {c.galleryUrls.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 16 }}>
              {c.galleryUrls.slice(0, 6).map((u, i) => (
                <img key={i} src={u} alt="" style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 8 }} />
              ))}
            </div>
          )}

          {/* Precio pedido destacado */}
          <div style={{ marginTop: 20, background: "#F6F7F9", borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", color: "#6B7280" }}>Precio pedido</div>
            <div style={{ fontFamily: "Georgia,serif", fontSize: 32, color: "#12182A", lineHeight: 1.1 }}>{fQ(inQ(c.price))}</div>
            <div style={{ fontSize: 16, color: "#6B7280" }}>{fUSD(inUSD(c.price))}</div>
          </div>

          {/* BLOQUE A — chips */}
          {chips.length > 0 && (
            <div className="chips avoid-break" style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(chips.length, 4)}, 1fr)`, gap: 8, marginTop: 14 }}>
              {chips.map((ch, i) => (
                <div key={i} style={{ border: "1px solid #E7E9EE", borderRadius: 10, padding: "10px 12px", background: "#FBFAF6", display: "flex", alignItems: "center", gap: 10, breakInside: "avoid" }}>
                  <span style={{ color: "#8A6A2E", display: "flex", flexShrink: 0 }}>{ch.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#12182A", lineHeight: 1.15 }}>{ch.value}</div>
                    <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: "#6B7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ch.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Precio por v² y m² en Q y USD */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
            <FBox label="Precio pedido / v²" main={fQ(inQ(pricePerV2))} sub={`${fUSD(inUSD(pricePerV2))} /v²`} />
            <FBox label="Precio pedido / m²" main={fQ(inQ(pricePerM2))} sub={`${fUSD(inUSD(pricePerM2))} /m²`} />
          </div>

          {/* BLOQUE B — Resumen */}
          {rows.length > 0 && (
            <div style={{ marginTop: 18 }} className="avoid-break">
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", color: "#6B7280", borderBottom: "1px solid #12182A", paddingBottom: 6, marginBottom: 4 }}>Resumen</div>
              <div className="summary" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 28 }}>
                {rows.map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, padding: "7px 0", borderBottom: "1px dotted #E0E2E8", breakInside: "avoid" }}>
                    <span style={{ fontSize: 11, color: "#6B7280", whiteSpace: "nowrap" }}>{k}</span>
                    <span style={{ fontSize: 12.5, color: "#12182A", fontWeight: 600, textAlign: "right" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notas de riesgo */}
          {(cuerdaWarning || locationWarning) && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              {cuerdaWarning && (
                <div style={{ fontSize: 11.5, color: "#A8423F", background: "#FBEBEA", border: "1px solid #F0D6D4", borderRadius: 8, padding: "8px 12px" }}>
                  Tamaño de cuerda no declarado — se asumió 25×25 v. El área en v² y el precio por v² cambian mucho si la cuerda es de 20×20 o 40×40. Confirmar antes de ofertar.
                </div>
              )}
              {locationWarning && (
                <div style={{ fontSize: 11.5, color: "#A8423F", background: "#FBEBEA", border: "1px solid #F0D6D4", borderRadius: 8, padding: "8px 12px" }}>
                  Sin número de catastro ni polígono — límites reales no verificados.
                </div>
              )}
            </div>
          )}

          {/* Análisis de precio (referencia de mercado) */}
          {(pricePerV2 != null && refAvg != null) && (
            <div className="avoid-break" style={{ marginTop: 14, border: "1px solid #E7E9EE", borderRadius: 12, padding: "14px 18px", background: deviation! > 5 ? "#FBEBEA" : deviation! < -5 ? "#E9F3EC" : "#F6F7F9" }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "#6B7280" }}>Análisis de precio (vs mercado)</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
                <span style={{ fontSize: 26, fontWeight: 700, color: devTone }}>{deviation! >= 0 ? "+" : ""}{deviation!.toFixed(0)}%</span>
                <span style={{ fontSize: 14, color: devTone }}>{deviation! > 5 ? "por encima del mercado" : deviation! < -5 ? "por debajo (oportunidad)" : "en línea con el mercado"}</span>
              </div>
              <div style={{ fontSize: 12.5, color: "#475065", marginTop: 6 }}>
                Pedido <strong>{fQ(inQ(pricePerV2))}/v²</strong> ({fUSD(inUSD(pricePerV2))}/v²) vs mercado <strong>{fQ(inQ(refAvg))}/v²</strong> ({fUSD(inUSD(refAvg))}/v²).{c.isCommercial && " Área comercial."}
              </div>
            </div>
          )}

          {/* Oferta recomendada */}
          <div className="avoid-break" style={{ marginTop: 14, background: "#0D1322", color: "#F4EFE6", borderRadius: 12, padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: ".2em", textTransform: "uppercase", color: "#C9A24B" }}>Oferta recomendada</div>
              <div style={{ fontSize: 12, opacity: .75, marginTop: 2 }}>
                {c.offerPerV2 != null ? `${fQ(inQ(c.offerPerV2))}/v² · ${fUSD(inUSD(c.offerPerV2))}/v²${c.isCommercial ? " (comercial)" : ""}` : "Sin definir"}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "Georgia, serif", fontSize: 32 }}>{fQ(inQ(offerTotal))}</div>
              <div style={{ fontSize: 15, opacity: .85 }}>{fUSD(inUSD(offerTotal))}</div>
              {c.price != null && offerTotal != null && (
                <div style={{ fontSize: 11, opacity: .7, marginTop: 2 }}>{(((offerTotal - c.price) / c.price) * 100).toFixed(0)}% vs pedido</div>
              )}
            </div>
          </div>

          {/* Descripción (según quien envió la propiedad) */}
          {c.description && (
            <div className="avoid-break" style={{ marginTop: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#12182A", marginBottom: 2 }}>Descripción</div>
              <div style={{ fontSize: 10.5, color: "#8E9098", marginBottom: 6 }}>Según la información proporcionada por quien envió la propiedad.</div>
              <RichText text={c.description} />
            </div>
          )}

          {/* Ubicación */}
          {(c.latitude != null && c.longitude != null) && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#12182A", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Ubicación</span>
                <a href={`https://www.google.com/maps?q=${c.latitude},${c.longitude}`} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 12, color: "#8A6A2E", fontWeight: 600 }}>Ver en Google Maps →</a>
              </div>
              <AcqMap items={mapItems} />
            </div>
          )}

          {/* Documentos de municipalidad */}
          {c.documentUrls.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#12182A", marginBottom: 8 }}>Documentos de la municipalidad</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {c.documentUrls.map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 12.5, color: "#12182A", background: "#F6F7F9", border: "1px solid #E7E9EE", borderRadius: 8, padding: "8px 12px", textDecoration: "none" }}>
                    📄 Documento {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Notas del analista */}
          {c.analysisNotes && (
            <div className="avoid-break" style={{ marginTop: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#12182A", marginBottom: 6 }}>Notas del analista</div>
              <RichText text={c.analysisNotes} />
            </div>
          )}

          <div style={{ marginTop: 24, paddingTop: 14, borderTop: "1px solid #E7E9EE", fontSize: 11, color: "#8E9098", textAlign: "center" }}>
            Generado con Noctua · {c.organization.name} · Análisis de referencia, no constituye avalúo formal.
          </div>
        </div>
      </div>
    </div>
  )
}

function FBox({ label, main, sub }: { label: string; main: string; sub?: string }) {
  return (
    <div style={{ border: "1px solid #E7E9EE", borderRadius: 10, padding: "12px 16px", background: "#FBFAF6" }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".05em", color: "#6B7280" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 3, color: "#12182A" }}>{main}</div>
      {sub && <div style={{ fontSize: 13, color: "#6B7280", marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

// Párrafo o bullets según cómo lo escribieron (sin campo nuevo).
function RichText({ text }: { text: string }) {
  const lines = text.split(/\r?\n+/).map(l => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean)
  if (lines.length <= 1) {
    return <p style={{ fontSize: 13.5, color: "#475065", whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.55 }}>{text}</p>
  }
  return (
    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: "#475065", lineHeight: 1.6 }}>
      {lines.map((l, i) => <li key={i} style={{ marginBottom: 3 }}>{l}</li>)}
    </ul>
  )
}
