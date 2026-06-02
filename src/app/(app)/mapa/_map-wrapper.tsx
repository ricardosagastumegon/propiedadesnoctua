"use client"
import dynamic from "next/dynamic"
import type { MapProperty } from "./page"

// Leaflet necesita window — desactivamos SSR para todo el bloque del mapa.
const MapView = dynamic(() => import("./_map").then(m => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] flex items-center justify-center text-sm text-muted-foreground bg-muted/20">
      Cargando mapa…
    </div>
  ),
})

export function MapWrapper(props: { properties: MapProperty[]; center: { lat: number; lon: number } }) {
  return <MapView {...props} />
}
