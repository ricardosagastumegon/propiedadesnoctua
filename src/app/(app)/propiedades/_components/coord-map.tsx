"use client"
import { MapContainer, TileLayer, WMSTileLayer, CircleMarker, Polygon, Marker, LayersControl, useMapEvents, useMap } from "react-leaflet"
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
  height?: number
  /** Cambiar este número fuerza un re-encuadre. NO cambia al dibujar/arrastrar. */
  fitKey?: number
}

function ClickHandler({ onPick, enabled }: { onPick: (lat: number, lon: number) => void; enabled: boolean }) {
  useMapEvents({
    click(e) { if (enabled) onPick(e.latlng.lat, e.latlng.lng) },
  })
  return null
}

// Encuadra SOLO cuando cambia fitKey (carga inicial, subir archivo, GTM, copiar, pegar).
// Nunca al arrastrar vértices → el mapa no se mueve mientras editás.
function FitView({ polygon, lat, lon, fitKey }: { polygon: LatLng[] | null; lat: number | null; lon: number | null; fitKey: number }) {
  const map = useMap()
  useEffect(() => {
    if (polygon && polygon.length >= 2) {
      const lats = polygon.map(p => p[0]), lons = polygon.map(p => p[1])
      map.fitBounds([[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]], { padding: [30, 30] })
    } else if (lat != null && lon != null) {
      map.setView([lat, lon], Math.max(map.getZoom(), 16))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey])
  return null
}

// Cuando cambia el alto (agrandar/reducir), Leaflet necesita recalcular su tamaño.
function InvalidateOnResize({ height }: { height: number }) {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 80)
    return () => clearTimeout(t)
  }, [height, map])
  return null
}

function makeHandle(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: '<div style="width:16px;height:16px;border-radius:50%;background:#C77816;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.35)"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

export function CoordMap({ lat, lon, polygon, drawing, editing = false, onPick, onMoveVertex, height = 480, fitKey = 0 }: Props) {
  const center: [number, number] = lat != null && lon != null ? [lat, lon] : [14.6349, -90.5069]
  const handle = useMemo(() => makeHandle(), [])

  return (
    <div className={`rounded-md overflow-hidden border ${drawing ? "ring-2 ring-amber-400" : editing ? "ring-2 ring-orange-400" : ""}`}>
      <MapContainer center={center} zoom={lat != null ? 16 : 12} style={{ height, width: "100%" }} scrollWheelZoom>
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Satélite">
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a> World Imagery'
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
          {/* Catastro oficial del RIC — para dibujar/ajustar contra los predios reales */}
          <LayersControl.Overlay name="Catastro RIC (Guatemala)">
            <WMSTileLayer
              url="https://portal.ric.gob.gt/geoserver/wms"
              params={{ layers: "GEO_RIC:PREDIO", format: "image/png", transparent: true, version: "1.1.1" }}
              opacity={0.6}
              attribution='Catastro &copy; <a href="https://portal.ric.gob.gt/">RIC Guatemala</a>'
            />
          </LayersControl.Overlay>
        </LayersControl>
        <ClickHandler onPick={onPick} enabled={drawing} />
        <FitView polygon={polygon} lat={lat} lon={lon} fitKey={fitKey} />
        <InvalidateOnResize height={height} />

        {polygon && polygon.length >= 2 && (
          <Polygon
            positions={polygon}
            pathOptions={{ color: "#2C6B43", fillColor: "#3F8E5C", fillOpacity: 0.35, weight: 2 }}
          />
        )}

        {drawing && !editing && polygon?.map((p, i) => (
          <CircleMarker key={i} center={p} radius={4}
            pathOptions={{ fillColor: "#C77816", fillOpacity: 1, color: "white", weight: 1 }} />
        ))}

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

        {!polygon && lat != null && lon != null && (
          <CircleMarker center={[lat, lon]} radius={11}
            pathOptions={{ fillColor: "#3F8E5C", fillOpacity: 0.9, color: "#2C6B43", weight: 2 }} />
        )}
      </MapContainer>
    </div>
  )
}
