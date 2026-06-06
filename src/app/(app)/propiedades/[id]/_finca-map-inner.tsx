"use client"
import { MapContainer, TileLayer, Polygon, Tooltip, LayersControl, useMap } from "react-leaflet"
import { useEffect } from "react"
import "leaflet/dist/leaflet.css"
import type { FincaMapParcel } from "./_finca-map"

function FitBounds({ parcels }: { parcels: FincaMapParcel[] }) {
  const map = useMap()
  useEffect(() => {
    const all = parcels.flatMap(p => [...p.polygon, ...(p.realPolygon ?? [])])
    if (all.length === 0) return
    const lats = all.map(p => p[0]), lons = all.map(p => p[1])
    map.fitBounds([[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]], { padding: [30, 30] })
  }, [parcels, map])
  return null
}

export function FincaMapInner({ parcels }: { parcels: FincaMapParcel[] }) {
  const first = parcels[0]?.polygon[0] ?? parcels[0]?.realPolygon?.[0] ?? [14.6349, -90.5069]
  const hasReal = parcels.some(p => p.realPolygon && p.realPolygon.length >= 3)
  const hasLegal = parcels.some(p => p.polygon && p.polygon.length >= 3)

  return (
    <div className="rounded-md overflow-hidden border">
      <MapContainer center={first} zoom={15} style={{ height: 360, width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a> World Imagery'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />
        <FitBounds parcels={parcels} />
        <LayersControl position="topright">
          {/* Capa LEGAL (del plano/RIC) — línea punteada azul */}
          <LayersControl.Overlay checked name="Contorno legal (plano/RIC)">
            <LegalLayer parcels={parcels} />
          </LayersControl.Overlay>
          {/* Capa REAL (medida en campo) — relleno verde */}
          <LayersControl.Overlay checked name="Contorno real (medido)">
            <RealLayer parcels={parcels} />
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>
      {/* Leyenda */}
      <div className="flex items-center gap-4 px-3 py-2 text-xs bg-white border-t">
        {hasLegal && (
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0 border-t-2 border-dashed border-blue-600 inline-block" /> Legal (plano/RIC)
          </span>
        )}
        {hasReal && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500/50 border border-emerald-700 inline-block" /> Real (medido)
          </span>
        )}
        <span className="text-muted-foreground ml-auto">Capas activables arriba a la derecha ▸</span>
      </div>
    </div>
  )
}

// react-leaflet requiere que los hijos de Overlay sean componentes de capa.
// Agrupamos los polígonos en fragmentos.
function LegalLayer({ parcels }: { parcels: FincaMapParcel[] }) {
  return (
    <>
      {parcels.filter(p => p.polygon.length >= 3).map(p => (
        <Polygon key={`legal-${p.id}`} positions={p.polygon}
          pathOptions={{ color: "#2563EB", weight: 2, dashArray: "6 5", fill: false }}>
          <Tooltip sticky>{p.label} — legal</Tooltip>
        </Polygon>
      ))}
    </>
  )
}

function RealLayer({ parcels }: { parcels: FincaMapParcel[] }) {
  return (
    <>
      {parcels.filter(p => p.realPolygon && p.realPolygon.length >= 3).map(p => (
        <Polygon key={`real-${p.id}`} positions={p.realPolygon!}
          pathOptions={{ color: "#2C6B43", fillColor: "#3F8E5C", fillOpacity: 0.4, weight: 2 }}>
          <Tooltip sticky>{p.label} — real</Tooltip>
        </Polygon>
      ))}
    </>
  )
}
