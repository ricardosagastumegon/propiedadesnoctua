"use client"
import { MapContainer, TileLayer, CircleMarker, Polygon, Marker, useMapEvents, useMap } from "react-leaflet"
import { useEffect, useMemo } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { LatLng } from "@/lib/geo"

interface Props {
  lat: number | null
  lon: number | null
  polygon: LatLng[] | null
  drawing: boolean
  editing?: boolean
  onPick: (lat: number, lon: number) => void
  onMoveVertex?: (index: number, lat: number, lon: number) => void
}

function ClickHandler({ onPick, enabled }: { onPick: (lat: number, lon: number) => void; enabled: boolean }) {
  useMapEvents({
    click(e) { if (enabled) onPick(e.latlng.lat, e.latlng.lng) },
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

// Punto arrastrable (divIcon, sin imagen) para editar vértices
function makeHandle(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: '<div style="width:14px;height:14px;border-radius:50%;background:#C77816;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.3)"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

export function CoordMap({ lat, lon, polygon, drawing, editing = false, onPick, onMoveVertex }: Props) {
  const center: [number, number] = lat != null && lon != null ? [lat, lon] : [14.6349, -90.5069]
  const handle = useMemo(() => makeHandle(), [])

  return (
    <div className={`rounded-md overflow-hidden border ${drawing ? "ring-2 ring-amber-400" : editing ? "ring-2 ring-orange-400" : ""}`}>
      <MapContainer center={center} zoom={lat != null ? 16 : 12} style={{ height: 340, width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a> World Imagery'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />
        <ClickHandler onPick={onPick} enabled={drawing} />
        <Recenter lat={lat} lon={lon} />

        {/* Polígono dibujado/cargado */}
        {polygon && polygon.length >= 2 && (
          <Polygon
            positions={polygon}
            pathOptions={{ color: "#2C6B43", fillColor: "#3F8E5C", fillOpacity: 0.35, weight: 2 }}
          />
        )}

        {/* Vértices mientras se dibuja (no arrastrables) */}
        {drawing && !editing && polygon?.map((p, i) => (
          <CircleMarker key={i} center={p} radius={4}
            pathOptions={{ fillColor: "#C77816", fillOpacity: 1, color: "white", weight: 1 }} />
        ))}

        {/* Vértices ARRASTRABLES en modo edición */}
        {editing && polygon?.map((p, i) => (
          <Marker
            key={i}
            position={p}
            draggable
            icon={handle}
            eventHandlers={{
              dragend: (e) => {
                const ll = (e.target as L.Marker).getLatLng()
                onMoveVertex?.(i, ll.lat, ll.lng)
              },
            }}
          />
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
