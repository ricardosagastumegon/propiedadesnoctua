import { redirect, notFound } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/permissions"
import { toVaras2, v2ToM2, convertCurrency, type AreaUnit } from "@/lib/varas"
import { isValidPolygon, type LatLng } from "@/lib/geo"
import { AcqMap, type AcqMapItem } from "@/app/(app)/adquisiciones/mapa/_map"
import { PrintButton } from "./_print-btn"

export const dynamic = "force-dynamic"

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

  const areaV2 = toVaras2(c.area, c.areaUnit as AreaUnit | null, c.cuerdaVaras)
  const areaM2 = v2ToM2(areaV2)
  const pricePerV2 = c.price != null && areaV2 ? c.price / areaV2 : null
  const pricePerM2 = c.price != null && areaM2 ? c.price / areaM2 : null
  const refAvg = c.refPriceMinV2 != null && c.refPriceMaxV2 != null ? (c.refPriceMinV2 + c.refPriceMaxV2) / 2 : null
  const deviation = pricePerV2 != null && refAvg ? ((pricePerV2 - refAvg) / refAvg) * 100 : null
  const offerTotal = c.offerPerV2 != null && areaV2 ? c.offerPerV2 * areaV2 : null
  const loc = [c.zone, c.city, c.department].filter(Boolean).join(", ")

  const mapItems: AcqMapItem[] = (c.latitude != null && c.longitude != null) ? [{
    id: c.id, title: c.title, stage: c.stage, price: c.price, currency: c.currency,
    lat: c.latitude, lng: c.longitude,
    polygon: isValidPolygon(c.mapPolygon) ? (c.mapPolygon as LatLng[]) : null,
  }] : []

  const devTone = deviation == null ? "#6B7280" : deviation > 5 ? "#A8423F" : deviation < -5 ? "#2C6B43" : "#12182A"

  return (
    <div style={{ background: "#F6F7F9", minHeight: "100vh" }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .sheet { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; }
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
            {c.organization.name}<br />{new Date().toLocaleDateString("es-GT")}
          </div>
        </div>

        <div style={{ padding: "24px 28px" }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 26, color: "#12182A", margin: 0 }}>{c.title}</h1>
          {loc && <div style={{ color: "#6B7280", fontSize: 14, marginTop: 4 }}>📍 {loc}</div>}

          {/* Fotos */}
          {c.galleryUrls.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 16 }}>
              {c.galleryUrls.slice(0, 6).map((u, i) => (
                <img key={i} src={u} alt="" style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 8 }} />
              ))}
            </div>
          )}

          {/* Precio pedido destacado */}
          <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F6F7F9", borderRadius: 12, padding: "16px 20px", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", color: "#6B7280" }}>Precio pedido</div>
              <div style={{ fontFamily: "Georgia,serif", fontSize: 32, color: "#12182A", lineHeight: 1.1 }}>{fQ(inQ(c.price))}</div>
              <div style={{ fontSize: 16, color: "#6B7280" }}>{fUSD(inUSD(c.price))}</div>
            </div>
            <div style={{ textAlign: "right", fontSize: 12.5, color: "#6B7280" }}>
              {c.propertyType && <div>{c.propertyType}</div>}
              {c.cadastralNumber && <div>Catastro: <strong style={{ color: "#12182A" }}>{c.cadastralNumber}</strong></div>}
            </div>
          </div>

          {/* Área v² y m² */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
            <FBox label="Área (v²)" main={areaV2 ? `${Math.round(areaV2).toLocaleString("es-GT")} v²` : "—"} />
            <FBox label="Área (m²)" main={areaM2 ? `${Math.round(areaM2).toLocaleString("es-GT")} m²` : "—"} />
          </div>

          {/* Precio por v² y m² en Q y USD */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
            <FBox label="Precio pedido / v²" main={fQ(inQ(pricePerV2))} sub={`${fUSD(inUSD(pricePerV2))} /v²`} />
            <FBox label="Precio pedido / m²" main={fQ(inQ(pricePerM2))} sub={`${fUSD(inUSD(pricePerM2))} /m²`} />
          </div>

          {/* Análisis de precio (referencia de mercado) */}
          {(pricePerV2 != null && refAvg != null) && (
            <div style={{ marginTop: 12, border: "1px solid #E7E9EE", borderRadius: 12, padding: "14px 18px", background: deviation! > 5 ? "#FBEBEA" : deviation! < -5 ? "#E9F3EC" : "#F6F7F9" }}>
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
          <div style={{ marginTop: 14, background: "#0D1322", color: "#F4EFE6", borderRadius: 12, padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
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
          {c.cadastralNumber && (c.latitude == null || c.longitude == null) && (
            <div style={{ marginTop: 14, fontSize: 12.5, color: "#475065" }}>Catastro: <strong>{c.cadastralNumber}</strong> (sin coordenadas para el mapa)</div>
          )}

          {/* Notas */}
          {c.analysisNotes && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#12182A", marginBottom: 6 }}>Observaciones</div>
              <p style={{ fontSize: 13.5, color: "#475065", whiteSpace: "pre-wrap", margin: 0 }}>{c.analysisNotes}</p>
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
