"use client"
import { MapContainer, TileLayer, Polygon, Tooltip, useMap } from "react-leaflet"
import { useEffect } from "react"
import "leaflet/dist/leaflet.css"
import type { FincaMapParcel } from "./_finca-map"

const COLORS = ["#3F8E5C", "#3E6FB0", "#C7891C", "#9A5BB0", "#C8454F", "#2C9C8F"]

function FitBounds({ parcels }: { parcels: FincaMapParcel[] }) {
  const map = useMap()
  useEffect(() => {
    const all = parcels.flatMap(p => p.polygon)
    if (all.length === 0) return
    const lats = all.map(p => p[0]), lons = all.map(p => p[1])
    map.fitBounds([[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]], { padding: [30, 30] })
  }, [parcels, map])
  return null
}

export function FincaMapInner({ parcels }: { parcels: FincaMapParcel[] }) {
  const first = parcels[0]?.polygon[0] ?? [14.6349, -90.5069]
  return (
    <div className="rounded-md overflow-hidden border">
      <MapContainer center={first} zoom={15} style={{ height: 320, width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a> World Imagery'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />
        <FitBounds parcels={parcels} />
        {parcels.map((p, i) => (
          <Polygon
            key={p.id}
            positions={p.polygon}
            pathOptions={{ color: COLORS[i % COLORS.length], fillColor: COLORS[i % COLORS.length], fillOpacity: 0.4, weight: 2 }}
          >
            <Tooltip sticky>{p.label}</Tooltip>
          </Polygon>
        ))}
      </MapContainer>
    </div>
  )
}
