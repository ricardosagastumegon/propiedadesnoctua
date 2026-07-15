"use client"

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{ background: "#C9A24B", color: "#12182A", border: "none", fontWeight: 700, fontSize: 13, padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}
    >
      Descargar / Imprimir PDF
    </button>
  )
}
