"use client"
import { useState } from "react"
import { ACQ_CATEGORIES } from "@/lib/acquisition-categories"

/**
 * Selector de etiquetas (varias) para una propiedad. Mantiene un input oculto
 * con el JSON del array seleccionado, así cualquier <form> lo recoge con FormData.
 */
export function CategoryPicker({ name = "categories", initial = [] }: { name?: string; initial?: string[] }) {
  const [sel, setSel] = useState<string[]>(initial)
  function toggle(v: string) {
    setSel(prev => (prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]))
  }
  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(sel)} readOnly />
      <div className="flex flex-wrap gap-2">
        {ACQ_CATEGORIES.map(c => {
          const on = sel.includes(c.value)
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => toggle(c.value)}
              aria-pressed={on}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                on ? "bg-[#12182A] text-[#F4EFE6] border-[#12182A]" : "hover:bg-muted/50"
              }`}
            >
              {c.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
