"use client"
import dynamic from "next/dynamic"
import { useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { parseGeoFile, centroid, isValidPolygon, type LatLng } from "@/lib/geo"
import { MapPin, Pencil, Upload, Trash2, Check } from "lucide-react"

const MapPicker = dynamic(() => import("./coord-map").then(m => m.CoordMap), {
  ssr: false,
  loading: () => (
    <div className="h-[340px] flex items-center justify-center text-sm text-muted-foreground bg-muted/20 rounded-md border">
      Cargando mapa…
    </div>
  ),
})

interface Props {
  initialLat?: number | null
  initialLon?: number | null
  initialPolygon?: unknown
}

export function CoordPicker({ initialLat, initialLon, initialPolygon }: Props) {
  const [lat, setLat] = useState<string>(initialLat != null ? String(initialLat) : "")
  const [lon, setLon] = useState<string>(initialLon != null ? String(initialLon) : "")
  const [pasteValue, setPasteValue] = useState("")
  const [polygon, setPolygon] = useState<LatLng[] | null>(
    isValidPolygon(initialPolygon) ? initialPolygon : null,
  )
  const [drawing, setDrawing] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const latNum = lat ? parseFloat(lat) : null
  const lonNum = lon ? parseFloat(lon) : null
  const hasValidCoords = latNum != null && lonNum != null && !isNaN(latNum) && !isNaN(lonNum)

  function syncCentroid(poly: LatLng[] | null) {
    if (poly && poly.length >= 3) {
      const c = centroid(poly)
      if (c) { setLat(c[0].toFixed(6)); setLon(c[1].toFixed(6)) }
    }
  }

  function handlePaste(value: string) {
    setPasteValue(value)
    const m = value.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/)
    if (m) { setLat(m[1]); setLon(m[2]) }
  }

  function handleMapClick(clickedLat: number, clickedLon: number) {
    if (drawing) {
      setPolygon(prev => {
        const next = [...(prev ?? []), [clickedLat, clickedLon] as LatLng]
        return next
      })
    } else {
      setLat(clickedLat.toFixed(6))
      setLon(clickedLon.toFixed(6))
    }
  }

  function finishDrawing() {
    setDrawing(false)
    if (polygon && polygon.length >= 3) syncCentroid(polygon)
    else setPolygon(null)
  }

  function clearPolygon() {
    setPolygon(null)
    setDrawing(false)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null)
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const poly = parseGeoFile(file.name, text)
    if (!poly || poly.length < 3) {
      setFileError("No se pudo leer un polígono del archivo. Asegurate que sea KML o GeoJSON con un área.")
      return
    }
    setPolygon(poly)
    syncCentroid(poly)
    if (fileRef.current) fileRef.current.value = ""
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name="latitude" value={lat} />
      <input type="hidden" name="longitude" value={lon} />
      <input type="hidden" name="mapPolygon" value={polygon ? JSON.stringify(polygon) : ""} />

      {/* Acciones de contorno */}
      <div className="flex flex-wrap gap-2">
        {!drawing ? (
          <Button type="button" size="sm" variant="outline" onClick={() => setDrawing(true)}>
            <Pencil className="size-3.5 mr-1" />
            {polygon ? "Editar contorno" : "Dibujar contorno"}
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={finishDrawing}>
            <Check className="size-3.5 mr-1" />
            Terminar ({polygon?.length ?? 0} puntos)
          </Button>
        )}
        <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload className="size-3.5 mr-1" />
          Subir KML / GeoJSON
        </Button>
        <input ref={fileRef} type="file" accept=".kml,.geojson,.json,application/json,application/vnd.google-earth.kml+xml"
          className="hidden" onChange={handleFile} />
        {polygon && (
          <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={clearPolygon}>
            <Trash2 className="size-3.5 mr-1" />
            Quitar contorno
          </Button>
        )}
      </div>

      {drawing && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
          Modo dibujo: hacé click en cada esquina del lote sobre el mapa. Cuando termines, click en "Terminar".
        </p>
      )}
      {fileError && <p className="text-xs text-destructive">{fileError}</p>}

      {/* Mapa */}
      <MapPicker
        lat={hasValidCoords ? latNum! : null}
        lon={hasValidCoords ? lonNum! : null}
        polygon={polygon}
        drawing={drawing}
        onPick={handleMapClick}
      />

      {/* Pegar coordenadas (para pin rápido) */}
      <div className="space-y-1.5">
        <Label htmlFor="coordPaste" className="text-sm flex items-center gap-1.5">
          <MapPin className="size-3.5" /> Pegar coordenadas de Google Maps (opcional)
        </Label>
        <Input
          id="coordPaste"
          value={pasteValue}
          onChange={e => handlePaste(e.target.value)}
          placeholder="Ej: 14.634915, -90.506882"
        />
        <p className="text-xs text-muted-foreground">
          Click derecho en Google Maps sobre el lugar → se copian las coordenadas → pegalas acá.
        </p>
      </div>

      {/* Manual */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="latManual" className="text-sm">Latitud</Label>
          <Input id="latManual" value={lat} onChange={e => setLat(e.target.value)} placeholder="14.634915" inputMode="decimal" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lonManual" className="text-sm">Longitud</Label>
          <Input id="lonManual" value={lon} onChange={e => setLon(e.target.value)} placeholder="-90.506882" inputMode="decimal" />
        </div>
      </div>

      {polygon ? (
        <p className="text-xs text-emerald-700">✓ Contorno marcado ({polygon.length} puntos) — la propiedad se dibujará como polígono en el mapa.</p>
      ) : hasValidCoords ? (
        <p className="text-xs text-emerald-700">✓ Ubicación marcada — aparecerá como pin en el mapa.</p>
      ) : null}
    </div>
  )
}
