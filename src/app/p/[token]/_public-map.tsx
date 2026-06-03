"use client"
import dynamic from "next/dynamic"
import type { LatLng } from "@/lib/geo"

export interface PublicMapShape {
  id: string
  label: string
  polygon: LatLng[] | null
  point: LatLng | null
}

const Inner = dynamic(() => import("./_public-map-inner").then(m => m.PublicMapInner), {
  ssr: false,
  loading: () => (
    <div className="h-[360px] flex items-center justify-center text-sm text-gray-500 bg-gray-100">
      Cargando mapa…
    </div>
  ),
})

export function PublicMap({ shapes }: { shapes: PublicMapShape[] }) {
  if (shapes.length === 0) return null
  return <Inner shapes={shapes} />
}
