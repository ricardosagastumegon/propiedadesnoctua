"use client"
import { useEffect, useState } from "react"

// Detecta cuando hay un deploy nuevo (la versión del server difiere de la que
// cargó esta pestaña) y ofrece recargar. Resuelve el problema de "cache viejo".
const LOADED = process.env.NEXT_PUBLIC_APP_VERSION || "dev"

export function VersionWatcher() {
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    if (LOADED === "dev") return // en local no molesta
    let stop = false

    async function check() {
      try {
        const res = await fetch("/api/version", { cache: "no-store" })
        if (!res.ok) return
        const { version } = await res.json()
        if (!stop && version && version !== LOADED) setUpdateAvailable(true)
      } catch { /* sin red: ignorar */ }
    }

    check() // al abrir
    const interval = setInterval(check, 90_000) // cada 90s
    const onFocus = () => check()
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onFocus)
    return () => {
      stop = true
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onFocus)
    }
  }, [])

  if (!updateAvailable) return null

  return (
    <div style={{ position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 1100 }}>
      <div style={{
        maxWidth: 440, margin: "0 auto", background: "#0D1322", color: "#F4EFE6",
        borderRadius: 12, padding: "12px 16px", boxShadow: "0 12px 40px rgba(0,0,0,.45)",
        border: "1px solid #1B2942", display: "flex", gap: 12, alignItems: "center",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Hay una versión nueva de Noctua</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Actualizá para ver los últimos cambios.</div>
        </div>
        <button onClick={() => window.location.reload()} style={{
          background: "#C9A24B", color: "#12182A", border: "none", fontWeight: 700,
          fontSize: 13, padding: "9px 16px", borderRadius: 9, cursor: "pointer", flexShrink: 0,
        }}>Actualizar</button>
      </div>
    </div>
  )
}
