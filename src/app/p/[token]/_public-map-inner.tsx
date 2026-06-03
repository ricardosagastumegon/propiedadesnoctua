"use client"
import { MapContainer, TileLayer, Polygon, CircleMarker, useMap } from "react-leaflet"
import { useEffect } from "react"
import "leaflet/dist/leaflet.css"
import type { PublicMapShape } from "./_public-map"

function Fit({ shapes }: { shapes: PublicMapShape[] }) {
  const map = useMap()
  useEffect(() => {
    const pts = shapes.flatMap(s => s.polygon ?? (s.point ? [s.point] : []))
    if (pts.length === 0) return
    if (pts.length === 1) { map.setView(pts[0], 15); return }
    const lats = pts.map(p => p[0]), lons = pts.map(p => p[1])
    map.fitBounds([[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]], { padding: [30, 30] })
  }, [shapes, map])
  return null
}

export function PublicMapInner({ shapes }: { shapes: PublicMapShape[] }) {
  const center = shapes[0]?.polygon?.[0] ?? shapes[0]?.point ?? [14.6349, -90.5069]
  return (
    <MapContainer center={center} zoom={15} style={{ height: 360, width: "100%" }} scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; Esri World Imagery'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxZoom={19}
      />
      <Fit shapes={shapes} />
      {shapes.map(s =>
        s.polygon ? (
          <Polygon key={s.id} positions={s.polygon}
            pathOptions={{ color: "#2C6B43", fillColor: "#3F8E5C", fillOpacity: 0.4, weight: 2 }} />
        ) : s.point ? (
          <CircleMarker key={s.id} center={s.point} radius={11}
            pathOptions={{ color: "#2C6B43", fillColor: "#3F8E5C", fillOpacity: 0.9, weight: 2 }} />
        ) : null,
      )}
    </MapContainer>
  )
}
