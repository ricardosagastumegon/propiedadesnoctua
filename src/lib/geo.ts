// Utilidades geográficas: parseo de KML/GeoJSON y cálculo de centroide.
// Los polígonos se guardan como array de vértices [lat, lon].

export type LatLng = [number, number]

/** Centroide simple (promedio de vértices). Suficiente para centrar/pin. */
export function centroid(points: LatLng[]): LatLng | null {
  if (!points.length) return null
  const lat = points.reduce((s, p) => s + p[0], 0) / points.length
  const lon = points.reduce((s, p) => s + p[1], 0) / points.length
  return [lat, lon]
}

/** Extrae el primer polígono de un GeoJSON. Devuelve vértices [lat, lon]. */
export function parseGeoJSON(text: string): LatLng[] | null {
  try {
    const data = JSON.parse(text)
    const geom = findFirstPolygonGeometry(data)
    if (!geom) return null
    // GeoJSON usa [lon, lat]; lo invertimos a [lat, lon]
    const ring: number[][] = geom.coordinates[0]
    return ring.map(([lon, lat]) => [lat, lon] as LatLng)
  } catch {
    return null
  }
}

function findFirstPolygonGeometry(data: any): { type: string; coordinates: any } | null {
  if (!data || typeof data !== "object") return null
  if (data.type === "Polygon" && data.coordinates) return data
  if (data.type === "MultiPolygon" && data.coordinates) {
    return { type: "Polygon", coordinates: data.coordinates[0] }
  }
  if (data.type === "Feature" && data.geometry) return findFirstPolygonGeometry(data.geometry)
  if (data.type === "FeatureCollection" && Array.isArray(data.features)) {
    for (const f of data.features) {
      const g = findFirstPolygonGeometry(f)
      if (g) return g
    }
  }
  return null
}

/** Extrae el primer polígono de un KML. Devuelve vértices [lat, lon]. */
export function parseKML(text: string): LatLng[] | null {
  // KML <coordinates>lon,lat,alt lon,lat,alt ...</coordinates>
  const m = text.match(/<coordinates>([\s\S]*?)<\/coordinates>/i)
  if (!m) return null
  const raw = m[1].trim()
  const points: LatLng[] = []
  for (const triple of raw.split(/\s+/)) {
    const parts = triple.split(",")
    if (parts.length >= 2) {
      const lon = parseFloat(parts[0])
      const lat = parseFloat(parts[1])
      if (!isNaN(lat) && !isNaN(lon)) points.push([lat, lon])
    }
  }
  return points.length >= 3 ? points : null
}

/** Detecta el formato por extensión/contenido y parsea. */
export function parseGeoFile(filename: string, text: string): LatLng[] | null {
  const lower = filename.toLowerCase()
  if (lower.endsWith(".kml") || text.includes("<kml") || text.includes("<coordinates>")) {
    return parseKML(text)
  }
  // geojson / json
  return parseGeoJSON(text)
}

/** Valida que un array sea un polígono de vértices [lat, lon]. */
export function isValidPolygon(value: unknown): value is LatLng[] {
  return Array.isArray(value)
    && value.length >= 3
    && value.every(p => Array.isArray(p) && p.length === 2 && typeof p[0] === "number" && typeof p[1] === "number")
}
