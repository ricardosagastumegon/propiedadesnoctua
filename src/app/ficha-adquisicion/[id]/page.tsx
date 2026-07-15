import { redirect, notFound } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/permissions"
import { toVaras2, formatV2, type AreaUnit } from "@/lib/varas"
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

  const sym = c.currency === "USD" ? "$" : "Q"
  const fmt = (n: number | null, d = 0) => n == null ? "—" : `${sym}${n.toLocaleString("es-GT", { maximumFractionDigits: d })}`
  const areaV2 = toVaras2(c.area, c.areaUnit as AreaUnit | null, c.cuerdaVaras)
  const pricePerV2 = c.price != null && areaV2 ? c.price / areaV2 : null
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

          {/* Datos */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginTop: 20 }}>
            <Field label="Tipo" value={c.propertyType ?? "—"} />
            <Field label="Catastro" value={c.cadastralNumber ?? "—"} />
            <Field label="Área" value={areaV2 ? formatV2(areaV2) : (c.area?.toString() ?? "—")} />
            <Field label="Precio pedido" value={fmt(c.price)} />
          </div>

          {/* Análisis por v² */}
          <div style={{ marginTop: 22, border: "1px solid #E7E9EE", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ background: "#FBFAF6", padding: "10px 16px", fontWeight: 600, fontSize: 13, color: "#12182A", borderBottom: "1px solid #E7E9EE" }}>
              Análisis por vara² (v²)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 0 }}>
              <Cell label="Precio pedido / v²" value={fmt(pricePerV2)} />
              <Cell label="Ref. mercado / v²" value={refAvg != null ? `${fmt(c.refPriceMinV2)}–${fmt(c.refPriceMaxV2)}` : "—"} />
              <Cell label="Promedio / v²" value={fmt(refAvg)} />
              <Cell label="Desviación" value={deviation != null ? `${deviation >= 0 ? "+" : ""}${deviation.toFixed(0)}%` : "—"} color={devTone} />
            </div>
            {deviation != null && (
              <div style={{ padding: "8px 16px", fontSize: 12.5, color: "#475065", borderTop: "1px solid #E7E9EE" }}>
                {deviation > 5 ? `El precio pedido está ${Math.abs(deviation).toFixed(0)}% por encima del promedio de mercado de la zona.`
                  : deviation < -5 ? `El precio está ${Math.abs(deviation).toFixed(0)}% por debajo del promedio — posible oportunidad.`
                    : "El precio está en línea con el promedio de mercado."}
                {c.isCommercial && " Se considera área comercial."}
              </div>
            )}
          </div>

          {/* Oferta recomendada */}
          <div style={{ marginTop: 16, background: "#0D1322", color: "#F4EFE6", borderRadius: 12, padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: ".2em", textTransform: "uppercase", color: "#C9A24B" }}>Oferta recomendada</div>
              <div style={{ fontSize: 12, opacity: .75, marginTop: 2 }}>
                {c.offerPerV2 != null ? `${fmt(c.offerPerV2)} por v²${c.isCommercial ? " (comercial)" : ""}` : "Sin definir"}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "Georgia, serif", fontSize: 30 }}>{offerTotal != null ? fmt(offerTotal) : "—"}</div>
              {c.price != null && offerTotal != null && (
                <div style={{ fontSize: 11, opacity: .7 }}>{(((offerTotal - c.price) / c.price) * 100).toFixed(0)}% vs pedido {fmt(c.price)}</div>
              )}
            </div>
          </div>

          {/* Mapa */}
          {mapItems.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#12182A", marginBottom: 8 }}>Ubicación</div>
              <AcqMap items={mapItems} />
            </div>
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "#6B7280" }}>{label}</div>
      <div style={{ fontSize: 14, color: "#12182A", fontWeight: 500, marginTop: 2 }}>{value}</div>
    </div>
  )
}

function Cell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: "12px 16px", borderRight: "1px solid #E7E9EE", borderTop: "1px solid #E7E9EE" }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".05em", color: "#6B7280" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, marginTop: 3, color: color ?? "#12182A" }}>{value}</div>
    </div>
  )
}
