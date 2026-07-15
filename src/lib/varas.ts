// Conversión de áreas a VARA CUADRADA (v²) para el análisis inmobiliario de Guatemala.
// Vara guatemalteca = 0.835 m → 1 v² = 0.835² = 0.697225 m².
export const VARA_M = 0.835
export const VARA2_M2 = VARA_M * VARA_M // 0.697225

export type AreaUnit = "V2" | "M2" | "CUERDA" | "MANZANA" | "HECTAREA" | "CABALLERIA"

export const AREA_UNITS: { value: AreaUnit; label: string }[] = [
  { value: "V2", label: "Varas² (v²)" },
  { value: "M2", label: "Metros² (m²)" },
  { value: "CUERDA", label: "Cuerdas" },
  { value: "MANZANA", label: "Manzanas" },
  { value: "HECTAREA", label: "Hectáreas" },
  { value: "CABALLERIA", label: "Caballerías" },
]

// Tamaños de cuerda comunes en Guatemala (varas por lado → v² = lado²).
export const CUERDA_SIZES = [
  { varas: 20, label: "20 × 20 (400 v²)" },
  { varas: 25, label: "25 × 25 (625 v²)" },
  { varas: 30, label: "30 × 30 (900 v²)" },
  { varas: 40, label: "40 × 40 (1,600 v²)" },
]

/** Convierte un área a vara cuadrada (v²). Devuelve null si no se puede. */
export function toVaras2(value: number | null | undefined, unit: AreaUnit | null | undefined, cuerdaVaras?: number | null): number | null {
  if (value == null || isNaN(value) || value <= 0 || !unit) return null
  switch (unit) {
    case "V2": return value
    case "M2": return value / VARA2_M2
    case "CUERDA": {
      const lado = cuerdaVaras && cuerdaVaras > 0 ? cuerdaVaras : 25
      return value * lado * lado
    }
    case "MANZANA": return value * 10000
    case "HECTAREA": return value * (10000 / VARA2_M2) // 14342.5
    case "CABALLERIA": return value * 640000
    default: return null
  }
}

export function formatV2(v2: number | null): string {
  if (v2 == null) return "—"
  return `${Math.round(v2).toLocaleString("es-GT")} v²`
}
