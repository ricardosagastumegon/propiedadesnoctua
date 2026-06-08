"use client"
import { useEffect, useState } from "react"

// Banner para instalar Noctua como webapp en el celular (PWA).
// Android/Chrome: usa el prompt nativo (beforeinstallprompt).
// iOS/Safari: muestra instrucciones (Compartir → Agregar a inicio).
type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

const DISMISS_KEY = "noctua_install_dismissed_at"
const DISMISS_DAYS = 5

export function InstallPrompt() {
  const [show, setShow] = useState(false)
  const [deferred, setDeferred] = useState<BIPEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    // ¿Ya está instalada? (corriendo como app) → no mostrar
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as unknown as { standalone?: boolean }).standalone === true
    if (standalone) return

    // ¿Es celular?
    const ua = window.navigator.userAgent
    const mobile = /Android|iPhone|iPad|iPod/i.test(ua)
    if (!mobile) return

    // ¿Descartado hace poco?
    const dismissed = Number(localStorage.getItem(DISMISS_KEY) || 0)
    if (dismissed && Date.now() - dismissed < DISMISS_DAYS * 86400000) return

    const ios = /iPhone|iPad|iPod/i.test(ua)
    setIsIOS(ios)

    if (ios) {
      // iOS no soporta prompt nativo → mostramos instrucciones
      setShow(true)
      return
    }

    // Android/Chrome: esperar el evento de instalación
    const onBIP = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BIPEvent)
      setShow(true)
    }
    window.addEventListener("beforeinstallprompt", onBIP)
    return () => window.removeEventListener("beforeinstallprompt", onBIP)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setShow(false)
  }

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    try { await deferred.userChoice } catch { /* no-op */ }
    setShow(false)
    setDeferred(null)
  }

  if (!show) return null

  return (
    <div style={{ position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 1000 }}>
      <div style={{
        maxWidth: 480, margin: "0 auto", background: "#0D1322", color: "#F4EFE6",
        borderRadius: 14, padding: "14px 16px", boxShadow: "0 12px 40px rgba(0,0,0,.45)",
        border: "1px solid #1B2942", display: "flex", gap: 12, alignItems: "center",
      }}>
        <svg width="34" height="34" viewBox="0 0 800 800" fill="none" stroke="#C9A24B" strokeWidth={16}
          strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true">
          <g transform="translate(115,0) scale(0.8)">
            <path d="M 290 400 C 276 345, 278 285, 296 232 C 305 200, 318 180, 332 182 C 339 196, 345 218, 350 240 C 367 248, 385 248, 400 244 C 415 248, 433 248, 450 240 C 455 218, 461 196, 468 182 C 482 180, 495 200, 504 232 C 522 285, 524 345, 510 400 C 548 448, 566 532, 566 626 C 566 730, 532 808, 476 850 C 444 868, 412 873, 400 873 C 388 873, 356 868, 324 850 C 268 808, 234 730, 234 626 C 234 532, 252 448, 290 400 Z"/>
            <path d="M 400 460 Q 398 600, 400 740 Q 400 810, 400 855"/>
          </g>
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Instalá Noctua en tu teléfono</div>
          {isIOS ? (
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
              Tocá <strong>Compartir</strong> ⬆️ y luego <strong>“Agregar a inicio”</strong>.
            </div>
          ) : (
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
              Acceso directo, pantalla completa, como una app — sin descargar de la tienda.
            </div>
          )}
        </div>
        {!isIOS && (
          <button onClick={install} style={{
            background: "#C9A24B", color: "#12182A", border: "none", fontWeight: 700,
            fontSize: 13, padding: "9px 16px", borderRadius: 9, cursor: "pointer", flexShrink: 0,
          }}>Instalar</button>
        )}
        <button onClick={dismiss} aria-label="Cerrar" style={{
          background: "transparent", color: "#C9C6BC", border: "none", cursor: "pointer",
          fontSize: 20, lineHeight: 1, padding: 4, flexShrink: 0,
        }}>×</button>
      </div>
    </div>
  )
}
