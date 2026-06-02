"use client"
import { MapContainer, TileLayer, CircleMarker, Polygon, useMapEvents, useMap } from "react-leaflet"
import { useEffect } from "react"
import "leaflet/dist/leaflet.css"
import type { LatLng } from "@/lib/geo"

interface Props {
  lat: number | null
  lon: number | null
  polygon: LatLng[] | null
  drawing: boolean
  onPick: (lat: number, lon: number) => void
}

function ClickHandler({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) { onPick(e.latlng.lat, e.latlng.lng) },
  })
  return null
}

function Recenter({ lat, lon }: { lat: number | null; lon: number | null }) {
  const map = useMap()
  useEffect(() => {
    if (lat != null && lon != null) {
      map.setView([lat, lon], Math.max(map.getZoom(), 16))
    }
  }, [lat, lon, map])
  return null
}

export function CoordMap({ lat, lon, polygon, drawing, onPick }: Props) {
  const center: [number, number] = lat != null && lon != null ? [lat, lon] : [14.6349, -90.5069]

  return (
    <div className={`rounded-md overflow-hidden border ${drawing ? "ring-2 ring-amber-400" : ""}`}>
      <MapContainer center={center} zoom={lat != null ? 16 : 12} style={{ height: 340, width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a> World Imagery'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />
        <ClickHandler onPick={onPick} />
        <Recenter lat={lat} lon={lon} />

        {/* Polígono dibujado/cargado */}
        {polygon && polygon.length >= 2 && (
          <Polygon
            positions={polygon}
            pathOptions={{ color: "#2C6B43", fillColor: "#3F8E5C", fillOpacity: 0.35, weight: 2 }}
          />
        )}
        {/* Vértices mientras se dibuja */}
        {drawing && polygon?.map((p, i) => (
          <CircleMarker key={i} center={p} radius={4}
            pathOptions={{ fillColor: "#C77816", fillOpacity: 1, color: "white", weight: 1 }} />
        ))}

        {/* Pin (solo si no hay polígono) */}
        {!polygon && lat != null && lon != null && (
          <CircleMarker center={[lat, lon]} radius={11}
            pathOptions={{ fillColor: "#3F8E5C", fillOpacity: 0.9, color: "#2C6B43", weight: 2 }} />
        )}
      </MapContainer>
    </div>
  )
}
