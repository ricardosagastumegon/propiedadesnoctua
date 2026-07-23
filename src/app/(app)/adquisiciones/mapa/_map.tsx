"use client"
import dynamic from "next/dynamic"
import type { LatLng } from "@/lib/geo"

export interface AcqMapItem {
  id: string
  title: string
  stage: string
  price: number | null
  currency: string
  lat: number | null
  lng: number | null
  polygon: LatLng[] | null
  categories?: string[]
}

export interface PoiPoint {
  id: string
  name: string
  category: string | null
  municipality: string | null
  lat: number
  lng: number
}

const Inner = dynamic(() => import("./_map-inner").then(m => m.AcqMapInner), {
  ssr: false,
  loading: () => (
    <div className="h-[560px] flex items-center justify-center text-sm text-muted-foreground bg-muted/20 rounded-lg border">
      Cargando mapa…
    </div>
  ),
})

export function AcqMap({ items, pois = [] }: { items: AcqMapItem[]; pois?: PoiPoint[] }) {
  return <Inner items={items} pois={pois} />
}
