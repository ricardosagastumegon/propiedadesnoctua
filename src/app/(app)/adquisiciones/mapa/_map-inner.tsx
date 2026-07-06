"use client"
import { MapContainer, TileLayer, WMSTileLayer, Polygon, Marker, Popup, LayersControl, useMap } from "react-leaflet"
import { useEffect, useMemo } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { AcqMapItem } from "./_map"

const STAGE = {
  NEW:       { label: "Nuevas",      color: "#2563EB" },
  OFFERED:   { label: "Ofertadas",   color: "#C77A1E" },
  ACCEPTED:  { label: "Aceptadas",   color: "#3E8E5C" },
  DISCARDED: { label: "Descartadas", color: "#6B7280" },
} as const

function stageOf(s: string) {
  return (STAGE as Record<string, { label: string; color: string }>)[s] ?? STAGE.NEW
}

function priceLabel(n: number | null, c: string) {
  if (n == null) return "s/precio"
  const sym = c === "USD" ? "$" : "Q"
  const short = n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${Math.round(n / 1_000)}K` : `${n}`
  return `${sym}${short}`
}

// Etiqueta con el precio (pill de color según etapa) directamente sobre el mapa.
function priceIcon(item: AcqMapItem): L.DivIcon {
  const { color } = stageOf(item.stage)
  const txt = priceLabel(item.price, item.currency)
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};color:#fff;padding:2px 7px;border-radius:8px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.4);border:1.5px solid #fff;transform:translateY(-50%)">${txt}</div>`,
    iconSize: [1, 1],
    iconAnchor: [0, 0],
  })
}

function FitAll({ items }: { items: AcqMapItem[] }) {
  const map = useMap()
  useEffect(() => {
    const pts: [number, number][] = []
    for (const it of items) {
      if (it.lat != null && it.lng != null) pts.push([it.lat, it.lng])
      if (it.polygon) for (const p of it.polygon) pts.push([p[0], p[1]])
    }
    if (pts.length === 0) return
    if (pts.length === 1) { map.setView(pts[0], 15); return }
    const lats = pts.map(p => p[0]), lons = pts.map(p => p[1])
    map.fitBounds([[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]], { padding: [40, 40] })
  }, [items, map])
  return null
}

export function AcqMapInner({ items }: { items: AcqMapItem[] }) {
  const first = items.find(i => i.lat != null && i.lng != null)
  const center: [number, number] = first ? [first.lat!, first.lng!] : [14.6349, -90.5069]
  const icons = useMemo(() => new Map(items.map(i => [i.id, priceIcon(i)])), [items])

  return (
    <div className="rounded-lg overflow-hidden border">
      <MapContainer center={center} zoom={13} style={{ height: 560, width: "100%" }} scrollWheelZoom>
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Satélite">
            <TileLayer attribution='&copy; Esri' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Calles">
            <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          </LayersControl.BaseLayer>
          <LayersControl.Overlay name="Catastro RIC (Guatemala)">
            <WMSTileLayer url="https://portal.ric.gob.gt/geoserver/wms"
              params={{ layers: "GEO_RIC:PREDIO", format: "image/png", transparent: true, version: "1.1.1" }}
              opacity={0.6} attribution='Catastro &copy; RIC Guatemala' />
          </LayersControl.Overlay>
        </LayersControl>
        <FitAll items={items} />

        {items.map(it => {
          const st = stageOf(it.stage)
          return (
            <div key={it.id}>
              {it.polygon && it.polygon.length >= 3 && (
                <Polygon positions={it.polygon} pathOptions={{ color: st.color, fillColor: st.color, fillOpacity: 0.25, weight: 2 }} />
              )}
              {it.lat != null && it.lng != null && (
                <Marker position={[it.lat, it.lng]} icon={icons.get(it.id)}>
                  <Popup>
                    <div className="text-sm">
                      <div className="font-semibold">{it.title}</div>
                      <div className="text-xs" style={{ color: st.color }}>{st.label}</div>
                      <div className="mt-1">{it.price != null ? `${it.currency === "USD" ? "$" : "Q"} ${it.price.toLocaleString("es-GT")}` : "Sin precio"}</div>
                      <a href={`/adquisiciones/${it.id}`} className="text-blue-600 underline text-xs">Ver detalle →</a>
                    </div>
                  </Popup>
                </Marker>
              )}
            </div>
          )
        })}
      </MapContainer>

      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-4 px-3 py-2 text-xs bg-white border-t">
        {Object.values(STAGE).map(s => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: s.color }} /> {s.label}
          </span>
        ))}
        <span className="text-muted-foreground ml-auto">Capas y catastro RIC arriba a la derecha ▸</span>
      </div>
    </div>
  )
}
