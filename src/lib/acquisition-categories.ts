// Catálogo de etiquetas de propiedades para Adquisiciones (varias por propiedad).
// "Para / ideal para": apartamentos, plazas comerciales, bodegas, etc.
// Una candidata puede tener varias (String[]). Se usa para filtrar en el tablero y el mapa.

export interface AcqCategory {
  value: string
  label: string
}

export const ACQ_CATEGORIES: AcqCategory[] = [
  { value: "apartamentos", label: "Apartamentos" },
  { value: "casas", label: "Casas" },
  { value: "plazas_comerciales", label: "Plazas comerciales" },
  { value: "centros_comerciales", label: "Centros comerciales" },
  { value: "locales", label: "Locales comerciales" },
  { value: "oficinas", label: "Oficinas" },
  { value: "bodegas", label: "Bodegas" },
  { value: "lotificaciones", label: "Lotificaciones" },
  { value: "terrenos", label: "Terrenos" },
  { value: "gasolineras", label: "Gasolineras" },
  { value: "hoteleria", label: "Hotelería / turismo" },
  { value: "agroindustria", label: "Agroindustria / finca" },
]

const VALID = new Set(ACQ_CATEGORIES.map(c => c.value))

export const ACQ_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  ACQ_CATEGORIES.map(c => [c.value, c.label]),
)

/** Etiqueta legible de un value (o el propio value si no está en el catálogo). */
export function categoryLabel(value: string): string {
  return ACQ_CATEGORY_LABEL[value] ?? value
}

/** Filtra/normaliza una lista arbitraria a solo values válidos del catálogo (sin duplicados). */
export function sanitizeCategories(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const out: string[] = []
  for (const v of input) {
    if (typeof v === "string" && VALID.has(v) && !out.includes(v)) out.push(v)
  }
  return out
}
