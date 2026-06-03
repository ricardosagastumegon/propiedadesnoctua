// Utilidades geográficas: parseo de KML/GeoJSON, GTM (catastro Guatemala) y centroide.
// Los polígonos se guardan como array de vértices [lat, lon].
import proj4 from "proj4"

export type LatLng = [number, number]

// GTM = Guatemala Transverse Mercator (proyección oficial del catastro/RIC)
const GTM_PROJ = "+proj=tmerc +lat_0=0 +lon_0=-90.5 +k=0.9998 +x_0=500000 +y_0=0 +datum=WGS84 +units=m +no_defs"

/** Convierte un punto GTM (Este, Norte en metros) a [lat, lon] WGS84. */
export function gtmToLatLng(este: number, norte: number): LatLng {
  // proj4 espera [x=Este, y=Norte] → devuelve [lon, lat]
  const [lon, lat] = proj4(GTM_PROJ, "WGS84", [este, norte])
  return [lat, lon]
}

/**
 * Parsea un azimut en grados. Acepta:
 *  - decimal: "195.26"
 *  - DMS: "195°15'35.57\"" o "195 15 35.57" o "195-15-35.57"
 */
export function parseAzimuth(input: string): number | null {
  const s = input.trim()
  if (!s) return null
  // decimal puro
  if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s)
  // DMS: extraer números
  const nums = s.match(/\d+(\.\d+)?/g)
  if (!nums || nums.length < 1) return null
  const deg = parseFloat(nums[0])
  const min = nums[1] ? parseFloat(nums[1]) : 0
  const sec = nums[2] ? parseFloat(nums[2]) : 0
  return deg + min / 60 + sec / 3600
}

export interface TraverseLeg {
  azimuth: number   // grados decimales
  distance: number  // metros
}

/**
 * Calcula los vértices de un polígono a partir de:
 *  - Punto 0 en GTM (Este, Norte)
 *  - lista de tramos (azimut + distancia) que recorren el perímetro
 * Devuelve vértices [lat, lon] en WGS84.
 *
 * Azimut medido desde el Norte, sentido horario:
 *   ΔNorte = d·cos(az),  ΔEste = d·sin(az)
 */
export function gtmTraverseToPolygon(
  punto0Este: number,
  punto0Norte: number,
  legs: TraverseLeg[],
): LatLng[] {
  let e = punto0Este
  let n = punto0Norte
  const points: LatLng[] = [gtmToLatLng(e, n)]
  for (const leg of legs) {
    const rad = (leg.azimuth * Math.PI) / 180
    e += leg.distance * Math.sin(rad)
    n += leg.distance * Math.cos(rad)
    points.push(gtmToLatLng(e, n))
  }
  return points
}

/**
 * Parsea texto pegado de la tabla del plano. Cada línea: azimut + distancia.
 * Tolera columnas extra (EST, PO) al inicio — toma los últimos dos campos
 * relevantes: azimut (puede tener °'") y distancia (número con decimales).
 * Ejemplos de línea válida:
 *   "0  1  195°15'35.57\"  4644.16"
 *   "195 15 35.57, 4644.16"
 *   "246°57'35.55\"  6572.76"
 */
export function parseTraverseTable(text: string): TraverseLeg[] {
  const legs: TraverseLeg[] = []
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t) continue
    // La distancia es el último número decimal de la línea
    const distMatch = t.match(/(\d+\.\d+)\s*$/)
    if (!distMatch) continue
    const distance = parseFloat(distMatch[1])
    // El azimut es lo que está antes de la distancia, después de quitar
    // columnas iniciales de enteros sueltos (EST PO). Tomamos el bloque DMS.
    const before = t.slice(0, distMatch.index).trim()
    // Buscar patrón DMS (con ° ' ") o secuencia de 1-3 números al final del "before"
    const dmsMatch = before.match(/(\d+)\s*[°º]\s*(\d+)\s*['′]\s*([\d.]+)\s*["″]?/)
    let azimuth: number | null = null
    if (dmsMatch) {
      azimuth = parseFloat(dmsMatch[1]) + parseFloat(dmsMatch[2]) / 60 + parseFloat(dmsMatch[3]) / 3600
    } else {
      // últimos 1-3 números del before
      const nums = before.match(/\d+(\.\d+)?/g)
      if (nums && nums.length >= 1) {
        // descartar primeros enteros si hay muchos (EST PO); tomar últimos 3
        const tail = nums.slice(-3).map(parseFloat)
        if (tail.length === 3) azimuth = tail[0] + tail[1] / 60 + tail[2] / 3600
        else if (tail.length === 2) azimuth = tail[0] + tail[1] / 60
        else azimuth = tail[0]
      }
    }
    if (azimuth != null && !isNaN(distance)) {
      legs.push({ azimuth, distance })
    }
  }
  return legs
}

/** Centroide simple (promedio de vértices). Suficiente para centrar/pin. */
export function centroid(points: LatLng[]): LatLng | null {
  if (!points.length) return null
  const lat = points.reduce((s, p) => s + p[0], 0) / points.length
  const lon = points.reduce((s, p) => s + p[1], 0) / points.length
  return [lat, lon]
}

/** Convierte un objeto GeoJSON (ya parseado) al primer polígono [lat, lon]. */
export function geoJsonToPolygon(data: unknown): LatLng[] | null {
  const geom = findFirstPolygonGeometry(data)
  if (!geom) return null
  // GeoJSON usa [lon, lat]; lo invertimos a [lat, lon]
  const ring: number[][] = geom.coordinates[0]
  return ring.map(([lon, lat]) => [lat, lon] as LatLng)
}

/** Extrae el primer polígono de un GeoJSON (texto). Devuelve vértices [lat, lon]. */
export function parseGeoJSON(text: string): LatLng[] | null {
  try {
    return geoJsonToPolygon(JSON.parse(text))
  } catch {
    return null
  }
}

/**
 * Área de un polígono [lat, lon] en hectáreas, usando la fórmula esférica
 * (suficientemente precisa para predios y fincas).
 */
export function polygonAreaHectares(points: LatLng[]): number {
  const n = points.length
  if (n < 3) return 0
  const R = 6378137 // radio terrestre en metros (WGS84)
  const toRad = (d: number) => (d * Math.PI) / 180
  let area = 0
  for (let i = 0; i < n; i++) {
    const [lat1, lon1] = points[i]
    const [lat2, lon2] = points[(i + 1) % n]
    area += toRad(lon2 - lon1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)))
  }
  area = (area * R * R) / 2
  return Math.abs(area) / 10000 // m² → hectáreas
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
