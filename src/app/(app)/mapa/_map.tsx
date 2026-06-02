"use client"
import { useState, useMemo } from "react"
import { MapContainer, TileLayer, WMSTileLayer, CircleMarker, Popup, ZoomControl, LayersControl } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import type { MapProperty, PropertyStatus } from "./page"
import { formatGTQ } from "@/lib/format"

// MapTiler key opcional. Si está, usamos su satélite (más nítido). Si no,
// caemos a Esri World Imagery (gratis, sin key).
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY

type ViewMode = "status" | "expiration"

const STATUS_COLORS: Record<PropertyStatus, { fill: string; stroke: string; label: string }> = {
  ACTIVE: { fill: "#3F8E5C", stroke: "#2C6B43", label: "Arrendada (contrato activo)" },
  VACANT: { fill: "#FCE789", stroke: "#C9B044", label: "Libre / sin contrato" },
  EXPIRING: { fill: "#F4A33A", stroke: "#C77816", label: "Contrato por vencer (90 días)" },
  EXPIRED: { fill: "#C8454F", stroke: "#9A2730", label: "Contrato vencido" },
}

// Paleta para los 12 meses (vista de vencimientos)
const MONTH_COLORS: Record<number, string> = {
  1: "#7BAEF5", 2: "#A586E4", 3: "#9CC4D8", 4: "#7FB575",
  5: "#3F8E5C", 6: "#4FA570", 7: "#F4D54B", 8: "#F0BC2F",
  9: "#F08F2F", 10: "#E4642C", 11: "#C8454F", 12: "#933544",
}
const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

export function MapView({ properties, center }: { properties: MapProperty[]; center: { lat: number; lon: number } }) {
  const [mode, setMode] = useState<ViewMode>("status")

  function colorFor(p: MapProperty): { fill: string; stroke: string } {
    if (mode === "status") {
      const c = STATUS_COLORS[p.status]
      return { fill: c.fill, stroke: c.stroke }
    }
    // expiration mode
    if (!p.expirationMonth) return { fill: "#D5D2CB", stroke: "#7A7A7A" }
    return { fill: MONTH_COLORS[p.expirationMonth], stroke: "#3D3D3D" }
  }

  // Bounding box para auto-fit
  const bounds = useMemo(() => {
    if (properties.length === 0) return null
    const lats = properties.map(p => p.lat)
    const lons = properties.map(p => p.lon)
    return [
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)],
    ] as [[number, number], [number, number]]
  }, [properties])

  return (
    <div>
      {/* Toggle vista */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b">
        <div className="inline-flex border rounded-md p-0.5 text-sm">
          <button
            onClick={() => setMode("status")}
            className={`px-3 py-1.5 rounded transition-colors ${mode === "status" ? "bg-foreground text-background" : "hover:bg-muted"}`}
          >
            Por estado del contrato
          </button>
          <button
            onClick={() => setMode("expiration")}
            className={`px-3 py-1.5 rounded transition-colors ${mode === "expiration" ? "bg-foreground text-background" : "hover:bg-muted"}`}
          >
            Por mes de vencimiento
          </button>
        </div>
        <div className="text-xs text-muted-foreground">
          {properties.length} propiedades · click para detalle
        </div>
      </div>

      {/* Mapa */}
      <div className="relative">
        <MapContainer
          center={[center.lat, center.lon]}
          zoom={13}
          bounds={bounds ?? undefined}
          boundsOptions={{ padding: [50, 50] }}
          style={{ height: "640px", width: "100%" }}
          zoomControl={false}
        >
          <ZoomControl position="topright" />
          <LayersControl position="topright">
            {/* BASEMAPS — el usuario elige uno */}
            <LayersControl.BaseLayer checked name="Satélite">
              {MAPTILER_KEY ? (
                <TileLayer
                  attribution='&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; OpenStreetMap'
                  url={`https://api.maptiler.com/maps/satellite/{z}/{x}/{y}.jpg?key=${MAPTILER_KEY}`}
                />
              ) : (
                <TileLayer
                  attribution='&copy; <a href="https://www.esri.com/">Esri</a> World Imagery'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={19}
                />
              )}
            </LayersControl.BaseLayer>

            <LayersControl.BaseLayer name="Satélite + etiquetas">
              <TileLayer
                attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
            </LayersControl.BaseLayer>

            <LayersControl.BaseLayer name="Calles">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>

            {/* OVERLAY — catastro oficial del RIC Guatemala (opcional, sin key) */}
            <LayersControl.Overlay name="Catastro RIC (Guatemala)">
              <WMSTileLayer
                url="https://portal.ric.gob.gt/geoserver/wms"
                params={{
                  layers: "GEO_RIC:PREDIO",
                  format: "image/png",
                  transparent: true,
                  version: "1.1.1",
                }}
                opacity={0.6}
                attribution='Catastro &copy; <a href="https://portal.ric.gob.gt/">RIC Guatemala</a>'
              />
            </LayersControl.Overlay>
          </LayersControl>
          {properties.map(p => {
            const c = colorFor(p)
            return (
              <CircleMarker
                key={p.id}
                center={[p.lat, p.lon]}
                radius={12}
                pathOptions={{ fillColor: c.fill, fillOpacity: 0.85, color: c.stroke, weight: 2 }}
              >
                <Popup>
                  <div style={{ minWidth: 200 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                    {p.alias && <div style={{ fontSize: 12, color: "#666" }}>{p.alias}</div>}
                    <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                      {p.city}, {p.department}
                    </div>
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #eee", fontSize: 13 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLORS[p.status].fill, display: "inline-block" }} />
                        <strong>{STATUS_COLORS[p.status].label}</strong>
                      </div>
                      {p.tenantName && <div style={{ marginTop: 4 }}>Inquilino: {p.tenantName}</div>}
                      {p.monthlyRent && <div>Renta: {formatGTQ(p.monthlyRent)}/mes</div>}
                      {p.daysToExpiry != null && (
                        <div style={{ marginTop: 4, color: p.daysToExpiry < 0 ? "#C8454F" : p.daysToExpiry <= 90 ? "#C77816" : "#666" }}>
                          {p.daysToExpiry < 0
                            ? `Venció hace ${Math.abs(p.daysToExpiry)} días`
                            : `Vence en ${p.daysToExpiry} días`}
                          {p.expirationMonth && p.expirationYear && (
                            <span> ({MONTH_NAMES[p.expirationMonth - 1]} {p.expirationYear})</span>
                          )}
                        </div>
                      )}
                    </div>
                    <a
                      href={`/propiedades/${p.id}`}
                      style={{ display: "inline-block", marginTop: 10, fontSize: 12, color: "#3F8E5C", fontWeight: 600, textDecoration: "none" }}
                    >
                      Ver propiedad →
                    </a>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>

        {/* Leyenda */}
        <div className="absolute bottom-4 left-4 bg-white border rounded-md shadow-md p-3 text-xs z-[1000] max-w-[260px]">
          <div className="font-semibold mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            {mode === "status" ? "Estado del contrato" : "Mes de vencimiento"}
          </div>
          <div className="space-y-1.5">
            {mode === "status"
              ? (Object.entries(STATUS_COLORS) as [PropertyStatus, typeof STATUS_COLORS[PropertyStatus]][]).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border" style={{ background: v.fill, borderColor: v.stroke }} />
                    <span>{v.label}</span>
                  </div>
                ))
              : (
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {MONTH_NAMES.map((m, i) => (
                    <div key={m} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: MONTH_COLORS[i + 1] }} />
                      <span>{m}</span>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  )
}
