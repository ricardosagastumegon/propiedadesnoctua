import { describe, it, expect } from "vitest"
import {
  parseGeoJSON, geoJsonToPolygon, parseKML, centroid, isValidPolygon, polygonAreaHectares,
  gtmToLatLng, parseAzimuth, parseTraverseTable, gtmTraverseToPolygon,
} from "@/lib/geo"

describe("parseGeoJSON", () => {
  it("lee un Polygon simple y devuelve [lat,lon]", () => {
    const gj = JSON.stringify({ type: "Polygon", coordinates: [[[-90.5, 14.6], [-90.4, 14.6], [-90.4, 14.7], [-90.5, 14.6]]] })
    const r = parseGeoJSON(gj)
    expect(r).not.toBeNull()
    expect(r![0]).toEqual([14.6, -90.5]) // invertido a [lat,lon]
  })
  it("lee Feature → geometry Polygon", () => {
    const gj = JSON.stringify({ type: "Feature", geometry: { type: "Polygon", coordinates: [[[-90, 14], [-89, 14], [-89, 15], [-90, 14]]] } })
    expect(parseGeoJSON(gj)).not.toBeNull()
  })
  it("devuelve null si no hay polígono", () => {
    expect(parseGeoJSON('{"type":"Point","coordinates":[0,0]}')).toBeNull()
  })
})

describe("parseKML", () => {
  it("extrae coordinates lon,lat → [lat,lon]", () => {
    const kml = `<kml><Placemark><Polygon><outerBoundaryIs><LinearRing><coordinates>
      -90.5,14.6,0 -90.4,14.6,0 -90.4,14.7,0 -90.5,14.6,0
    </coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></kml>`
    const r = parseKML(kml)
    expect(r).not.toBeNull()
    expect(r![0]).toEqual([14.6, -90.5])
  })
})

describe("centroid / isValidPolygon", () => {
  it("centroide promedia los vértices", () => {
    expect(centroid([[0, 0], [2, 0], [2, 2], [0, 2]])).toEqual([1, 1])
  })
  it("valida polígono de ≥3 vértices [lat,lon]", () => {
    expect(isValidPolygon([[1, 2], [3, 4], [5, 6]])).toBe(true)
    expect(isValidPolygon([[1, 2]])).toBe(false)
    expect(isValidPolygon("nope")).toBe(false)
  })
})

describe("parseAzimuth", () => {
  it("decimal", () => { expect(parseAzimuth("195.26")).toBeCloseTo(195.26, 2) })
  it("DMS con símbolos", () => {
    expect(parseAzimuth(`195°15'35.57"`)).toBeCloseTo(195 + 15 / 60 + 35.57 / 3600, 4)
  })
  it("DMS con espacios", () => {
    expect(parseAzimuth("246 57 35.55")).toBeCloseTo(246 + 57 / 60 + 35.55 / 3600, 4)
  })
})

describe("gtmToLatLng", () => {
  it("convierte el Punto 0 del plano de ejemplo a Guatemala", () => {
    // Punto 0 = E 637392.811, N 1697172.387 GTM → debería caer en Guatemala
    const [lat, lon] = gtmToLatLng(637392.811, 1697172.387)
    expect(lat).toBeGreaterThan(13)
    expect(lat).toBeLessThan(18)
    expect(lon).toBeGreaterThan(-93)
    expect(lon).toBeLessThan(-88)
  })
})

describe("parseTraverseTable", () => {
  it("lee filas con EST PO azimut distancia", () => {
    const txt = `0  1  195°15'35.57"  4644.16
1  2  246°57'35.55"  6572.76
2  3  245°59'33.57"  2607.45`
    const legs = parseTraverseTable(txt)
    expect(legs.length).toBe(3)
    expect(legs[0].distance).toBeCloseTo(4644.16, 2)
    expect(legs[0].azimuth).toBeCloseTo(195 + 15 / 60 + 35.57 / 3600, 3)
  })
})

describe("geoJsonToPolygon (objeto, para shapefile vía shpjs)", () => {
  it("lee FeatureCollection con Polygon", () => {
    const fc = {
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: { type: "Polygon", coordinates: [[[-90.5, 14.6], [-90.4, 14.6], [-90.4, 14.7], [-90.5, 14.6]]] } }],
    }
    const r = geoJsonToPolygon(fc)
    expect(r).not.toBeNull()
    expect(r![0]).toEqual([14.6, -90.5])
  })
})

describe("polygonAreaHectares", () => {
  it("un cuadrado de ~1km de lado ≈ 100 ha", () => {
    // ~0.009° lat ≈ 1km. A 14.6°N, 0.00926° lon ≈ 1km
    const lat = 14.6, lon = -90.5
    const dLat = 1000 / 111320
    const dLon = 1000 / (111320 * Math.cos((lat * Math.PI) / 180))
    const sq: [number, number][] = [
      [lat, lon], [lat, lon + dLon], [lat + dLat, lon + dLon], [lat + dLat, lon], [lat, lon],
    ]
    const ha = polygonAreaHectares(sq)
    expect(ha).toBeGreaterThan(95)
    expect(ha).toBeLessThan(105)
  })
  it("menos de 3 puntos → 0", () => {
    expect(polygonAreaHectares([[0, 0], [1, 1]])).toBe(0)
  })
})

describe("gtmTraverseToPolygon", () => {
  it("genera un polígono cerrado con N+1 vértices", () => {
    const legs = [
      { azimuth: 90, distance: 100 },
      { azimuth: 180, distance: 100 },
      { azimuth: 270, distance: 100 },
      { azimuth: 0, distance: 100 },
    ]
    const poly = gtmTraverseToPolygon(637392.811, 1697172.387, legs)
    expect(poly.length).toBe(5) // punto 0 + 4 tramos
    poly.forEach(([lat, lon]) => {
      expect(lat).toBeGreaterThan(13)
      expect(lat).toBeLessThan(18)
      expect(lon).toBeGreaterThan(-93)
      expect(lon).toBeLessThan(-88)
    })
  })
})
