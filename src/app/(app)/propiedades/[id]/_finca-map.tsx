"use client"
import dynamic from "next/dynamic"
import type { LatLng } from "@/lib/geo"

export interface FincaMapParcel {
  id: string
  label: string
  polygon: LatLng[]          // contorno legal
  realPolygon?: LatLng[] | null  // contorno real (opcional)
}

const Inner = dynamic(() => import("./_finca-map-inner").then(m => m.FincaMapInner), {
  ssr: false,
  loading: () => (
    <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground bg-muted/20 rounded-md border">
      Cargando mapa…
    </div>
  ),
})

export function FincaMap({ parcels }: { parcels: FincaMapParcel[] }) {
  if (parcels.length === 0) return null
  return <Inner parcels={parcels} />
}
