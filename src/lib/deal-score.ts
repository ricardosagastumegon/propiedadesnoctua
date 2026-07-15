import { toVaras2, type AreaUnit } from "./varas"

export interface Ppv2Input {
  price: number | null
  area: number | null
  areaUnit: string | null
  cuerdaVaras: number | null
}

/** Precio por vara² de una candidata (o null si faltan datos). */
export function pricePerV2(i: Ppv2Input): number | null {
  const v2 = toVaras2(i.area, i.areaUnit as AreaUnit | null, i.cuerdaVaras)
  return i.price != null && v2 ? i.price / v2 : null
}

/**
 * Deal Score 0–100: qué tan buena oportunidad es.
 * Base 50; abajo del mercado suma, arriba resta; + comercial/ubicación/fotos.
 */
export function dealScore(
  ppv2: number | null,
  refAvg: number | null,
  extra: { isCommercial: boolean; hasLocation: boolean; photos: number },
): number | null {
  if (ppv2 == null || refAvg == null || refAvg <= 0) return null
  const dev = (ppv2 - refAvg) / refAvg // negativo = barato = mejor
  let s = 50
  s += Math.max(-40, Math.min(40, -dev * 100 * 0.8)) // ±40 según precio vs mercado
  if (extra.isCommercial) s += 8
  if (extra.hasLocation) s += 4
  if (extra.photos >= 3) s += 4
  return Math.max(0, Math.min(100, Math.round(s)))
}

export function scoreColor(s: number): string {
  return s >= 70 ? "#2C6B43" : s >= 45 ? "#C77A1E" : "#A8423F"
}

export function scoreLabel(s: number): string {
  return s >= 70 ? "Oportunidad" : s >= 45 ? "Regular" : "Caro"
}
