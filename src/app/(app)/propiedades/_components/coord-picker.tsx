"use client"
import dynamic from "next/dynamic"
import { useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { parseGeoFile, geoJsonToPolygon, centroid, isValidPolygon, polygonAreaHectares, formatAreaUnits, gtmTraverseToPolygon, parseTraverseTable, type LatLng } from "@/lib/geo"
import { Textarea } from "@/components/ui/textarea"
import { MapPin, Pencil, Upload, Trash2, Check, FileText } from "lucide-react"

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
  /** Nombre del input hidden del polígono (default "mapPolygon"). */
  fieldName?: string
  /** Si true, oculta los campos de lat/lon y pegar (solo contorno + mapa). */
  polygonOnly?: boolean
}

export function CoordPicker({ initialLat, initialLon, initialPolygon, fieldName = "mapPolygon", polygonOnly = false }: Props) {
  const [lat, setLat] = useState<string>(initialLat != null ? String(initialLat) : "")
  const [lon, setLon] = useState<string>(initialLon != null ? String(initialLon) : "")
  const [pasteValue, setPasteValue] = useState("")
  const [polygon, setPolygon] = useState<LatLng[] | null>(
    isValidPolygon(initialPolygon) ? initialPolygon : null,
  )
  const [drawing, setDrawing] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // GTM (plano catastral Guatemala)
  const [showGtm, setShowGtm] = useState(false)
  const [gtmEste, setGtmEste] = useState("")
  const [gtmNorte, setGtmNorte] = useState("")
  const [gtmTable, setGtmTable] = useState("")
  const [gtmError, setGtmError] = useState<string | null>(null)

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

  function computeGtm() {
    setGtmError(null)
    const este = parseFloat(gtmEste)
    const norte = parseFloat(gtmNorte)
    if (isNaN(este) || isNaN(norte)) {
      setGtmError("Ingresá las coordenadas del Punto 0 (Este y Norte en metros).")
      return
    }
    const legs = parseTraverseTable(gtmTable)
    if (legs.length < 2) {
      setGtmError("No se pudieron leer los tramos de la tabla. Pegá las columnas de azimut y distancia.")
      return
    }
    try {
      const poly = gtmTraverseToPolygon(este, norte, legs)
      setPolygon(poly)
      syncCentroid(poly)
      setShowGtm(false)
    } catch {
      setGtmError("Error al calcular el polígono. Verificá los datos.")
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null)
    const file = e.target.files?.[0]
    if (!file) return
    const lower = file.name.toLowerCase()

    let poly: LatLng[] | null = null
    try {
      if (lower.endsWith(".zip") || lower.endsWith(".shp")) {
        // Shapefile (lo que exporta QGIS/ArcGIS). shpjs reproyecta a WGS84 si trae .prj
        const shp = (await import("shpjs")).default
        const buf = await file.arrayBuffer()
        const geojson = await shp(buf)
        poly = geoJsonToPolygon(geojson)
      } else {
        // KML / GeoJSON (texto)
        const text = await file.text()
        poly = parseGeoFile(file.name, text)
      }
    } catch {
      setFileError("No se pudo leer el archivo. Verificá que sea un Shapefile (.zip), KML o GeoJSON válido.")
      return
    }

    if (!poly || poly.length < 3) {
      setFileError("No se encontró un polígono en el archivo. Asegurate que contenga un área (no solo puntos o líneas).")
      return
    }
    setPolygon(poly)
    syncCentroid(poly)
    if (fileRef.current) fileRef.current.value = ""
  }

  return (
    <div className="space-y-4">
      {!polygonOnly && <input type="hidden" name="latitude" value={lat} />}
      {!polygonOnly && <input type="hidden" name="longitude" value={lon} />}
      <input type="hidden" name={fieldName} value={polygon ? JSON.stringify(polygon) : ""} />

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
          Subir KML / GeoJSON / Shapefile
        </Button>
        <input ref={fileRef} type="file" accept=".kml,.geojson,.json,.zip,.shp,application/json,application/zip,application/vnd.google-earth.kml+xml"
          className="hidden" onChange={handleFile} />
        <Button type="button" size="sm" variant="outline" onClick={() => setShowGtm(v => !v)}>
          <FileText className="size-3.5 mr-1" />
          Plano catastral (GTM)
        </Button>
        {polygon && (
          <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={clearPolygon}>
            <Trash2 className="size-3.5 mr-1" />
            Quitar contorno
          </Button>
        )}
      </div>

      {/* Panel GTM — importar desde plano catastral de Guatemala */}
      {showGtm && (
        <div className="border rounded-md p-4 space-y-3 bg-muted/20">
          <div>
            <h4 className="text-sm font-medium">Importar desde plano catastral (GTM Guatemala)</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tu plano del RIC trae abajo el <strong>Punto 0</strong> y una tabla de <strong>azimut + distancia</strong>.
              Copiá esos datos acá y calculamos el contorno exacto.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Punto 0 — Este (E)</Label>
              <Input value={gtmEste} onChange={e => setGtmEste(e.target.value)} placeholder="637392.811" inputMode="decimal" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Punto 0 — Norte (N)</Label>
              <Input value={gtmNorte} onChange={e => setGtmNorte(e.target.value)} placeholder="1697172.387" inputMode="decimal" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tabla de tramos (azimut y distancia, una fila por línea)</Label>
            <Textarea
              value={gtmTable}
              onChange={e => setGtmTable(e.target.value)}
              rows={6}
              placeholder={`195°15'35.57\"  4644.16\n246°57'35.55\"  6572.76\n245°59'33.57\"  2607.45\n...`}
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Pegá las columnas de Azimut y Distancia del plano. Acepta formato 195°15&apos;35&quot; o 195 15 35.
            </p>
          </div>
          {gtmError && <p className="text-xs text-destructive">{gtmError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setShowGtm(false)}>Cancelar</Button>
            <Button type="button" size="sm" onClick={computeGtm}>Calcular contorno</Button>
          </div>
        </div>
      )}

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

      {!polygonOnly && (
        <>
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
        </>
      )}

      {polygon ? (
        <p className="text-xs text-emerald-700">
          ✓ Contorno marcado ({polygon.length} puntos
          {polygon.length >= 3 && ` · ${formatAreaUnits(polygonAreaHectares(polygon))}`}
          )
        </p>
      ) : hasValidCoords ? (
        <p className="text-xs text-emerald-700">✓ Ubicación marcada — aparecerá como pin en el mapa.</p>
      ) : null}
    </div>
  )
}
