"use client"

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "#0f172a", color: "white", border: "none",
        padding: "8px 16px", borderRadius: 6, fontSize: 12, cursor: "pointer",
      }}
    >
      ⬇ Descargar / Imprimir PDF
    </button>
  )
}
