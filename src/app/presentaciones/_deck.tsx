"use client"
import { useEffect, useRef, useState } from "react"

const SLIDES = 14
const STYLES = `
  :root {
    --charcoal: #2D2D2D;
    --jade: #3F8E5C;
    --jade-soft: #4FA570;
    --crema: #FAF8F4;
    --gray-700: #4A4A4A;
    --gray-500: #767676;
    --gray-300: #C9C5BC;
    --gray-200: #E3DFD6;
    --shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08);
  }
  body.__presentacion-body { background: var(--charcoal); color: var(--crema); margin: 0; overflow: hidden; }
  .__pdeck {
    background: var(--charcoal);
    color: var(--crema);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    font-size: 17px;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
    scroll-snap-type: y mandatory;
    overflow-y: scroll;
    height: 100vh;
  }
  .__pdeck .slide {
    scroll-snap-align: start;
    min-height: 100vh;
    padding: 64px 56px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: relative;
  }
  @media (max-width: 720px) {
    .__pdeck .slide { padding: 32px 20px; }
  }
  .__pdeck .alt { background: var(--crema); color: var(--charcoal); }
  .__pdeck .dark { background: var(--charcoal); color: var(--crema); }
  .__pdeck .jade { background: linear-gradient(135deg, var(--jade) 0%, var(--jade-soft) 100%); color: white; }
  .__pdeck .slide-num {
    position: absolute; top: 24px; right: 32px;
    font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.4;
  }
  .__pdeck .brand { font-family: Georgia, serif; font-weight: 600; letter-spacing: -0.01em; }
  .__pdeck h1 { font-size: clamp(40px, 6vw, 72px); line-height: 1.05; font-weight: 600; letter-spacing: -0.02em; margin: 0; }
  .__pdeck h2 { font-family: Georgia, serif; font-size: clamp(28px, 4vw, 44px); line-height: 1.15; font-weight: 600; letter-spacing: -0.01em; margin: 0 0 24px; }
  .__pdeck h3 { font-size: 22px; font-weight: 600; margin: 0 0 8px; letter-spacing: -0.01em; }
  .__pdeck p { margin: 0; }
  .__pdeck p.lead { font-size: clamp(18px, 2vw, 22px); max-width: 720px; opacity: 0.85; }
  .__pdeck .container { max-width: 1100px; margin: 0 auto; width: 100%; }
  .__pdeck .eyebrow { font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.55; margin-bottom: 16px; }
  .__pdeck .grid { display: grid; gap: 20px; margin-top: 36px; }
  .__pdeck .grid-2 { grid-template-columns: repeat(2, 1fr); }
  .__pdeck .grid-3 { grid-template-columns: repeat(3, 1fr); }
  @media (max-width: 900px) { .__pdeck .grid-2, .__pdeck .grid-3 { grid-template-columns: 1fr; } }
  .__pdeck .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px; }
  .__pdeck .alt .card { background: white; border: 1px solid var(--gray-200); box-shadow: var(--shadow); }
  .__pdeck .card .num { font-family: Georgia, serif; font-size: 36px; font-weight: 600; color: var(--jade); margin-bottom: 8px; display: block; }
  .__pdeck .pill { display: inline-block; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; padding: 4px 10px; border-radius: 999px; background: rgba(63, 142, 92, 0.16); color: var(--jade-soft); }
  .__pdeck .alt .pill { background: rgba(63, 142, 92, 0.12); color: var(--jade); }
  .__pdeck .check { display: flex; align-items: center; gap: 10px; margin: 6px 0; }
  .__pdeck .check::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--jade); flex-shrink: 0; }
  .__pdeck .module-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 32px; }
  @media (max-width: 720px) { .__pdeck .module-grid { grid-template-columns: repeat(2, 1fr); } }
  .__pdeck .module-tile { padding: 18px 16px; border-radius: 10px; background: white; border: 1px solid var(--gray-200); font-size: 14px; font-weight: 500; }
  .__pdeck .module-tile small { display: block; font-weight: 400; opacity: 0.5; font-size: 11px; margin-top: 4px; }
  .__pdeck .role-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-top: 28px; }
  @media (max-width: 720px) { .__pdeck .role-grid { grid-template-columns: 1fr; } }
  .__pdeck .role { padding: 18px 20px; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); }
  .__pdeck .role .name { font-weight: 600; font-size: 15px; display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .__pdeck .role .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--jade); }
  .__pdeck .role .desc { font-size: 13px; opacity: 0.7; }
  .__pdeck .stack { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }
  .__pdeck .stack span { font-size: 12px; padding: 6px 12px; border-radius: 6px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); }
  .__pdeck .cta { display: inline-block; margin-top: 0; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 16px; text-decoration: none; transition: transform 0.1s; cursor: pointer; }
  .__pdeck .cta:hover { transform: translateY(-1px); }
  .__pdeck .quote { border-left: 3px solid var(--jade); padding-left: 20px; font-family: Georgia, serif; font-size: 24px; font-style: italic; max-width: 720px; line-height: 1.4; opacity: 0.92; }
  .__pdeck table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 14px; }
  .__pdeck th, .__pdeck td { padding: 12px 14px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1); }
  .__pdeck th { font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.6; }
  /* Single price */
  .__pdeck .price-single { background: white; color: var(--charcoal); padding: 40px; border-radius: 16px; border: 2px solid var(--jade); box-shadow: var(--shadow); max-width: 520px; margin-top: 32px; }
  .__pdeck .price-single .tier { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--gray-500); font-weight: 600; }
  .__pdeck .price-single .amount { font-family: Georgia, serif; font-size: 56px; font-weight: 600; margin-top: 12px; line-height: 1; }
  .__pdeck .price-single .amount small { font-size: 16px; font-weight: 400; color: var(--gray-500); display: inline; margin-left: 8px; }
  .__pdeck .price-single ul { list-style: none; margin: 24px 0 28px; padding: 0; }
  .__pdeck .price-single ul li { padding: 8px 0; font-size: 15px; color: var(--gray-700); display: flex; gap: 10px; align-items: center; }
  .__pdeck .price-single ul li::before { content: "✓"; color: var(--jade); font-weight: 700; }
  .__pdeck .price-single .btn { display: inline-block; padding: 14px 28px; background: var(--jade); color: white; border-radius: 10px; font-weight: 600; text-decoration: none; }
  .__pdeck .nav-help { position: fixed; bottom: 16px; left: 24px; z-index: 10; font-size: 11px; opacity: 0.35; color: var(--crema); background: rgba(0,0,0,0.4); padding: 6px 12px; border-radius: 999px; backdrop-filter: blur(8px); }
  .__pdeck .footer-bar { position: fixed; bottom: 16px; right: 24px; z-index: 10; font-size: 12px; opacity: 0.45; color: var(--crema); }
  .__pdeck .dots { position: fixed; right: 24px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 10px; z-index: 5; }
  .__pdeck .dots a { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.25); transition: background 0.2s, transform 0.2s; display: block; }
  .__pdeck .dots a.active { background: var(--jade); transform: scale(1.4); }
  @media (max-width: 720px) { .__pdeck .dots, .__pdeck .footer-bar, .__pdeck .nav-help { display: none; } }
  .__pdeck .hero-stats { display: flex; gap: 48px; margin-top: 48px; flex-wrap: wrap; }
  .__pdeck .hero-stat .n { font-family: Georgia, serif; font-size: 44px; font-weight: 600; color: var(--jade-soft); }
  .__pdeck .hero-stat .l { font-size: 13px; opacity: 0.6; letter-spacing: 0.06em; text-transform: uppercase; margin-top: 4px; }
`

export function PresentacionDeck() {
  const deckRef = useRef<HTMLDivElement | null>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    document.body.classList.add("__presentacion-body")
    return () => { document.body.classList.remove("__presentacion-body") }
  }, [])

  useEffect(() => {
    const deck = deckRef.current
    if (!deck) return
    const onScroll = () => {
      const i = Math.round(deck.scrollTop / window.innerHeight)
      setActive(i)
    }
    deck.addEventListener("scroll", onScroll, { passive: true })
    const onKey = (e: KeyboardEvent) => {
      const cur = Math.round(deck.scrollTop / window.innerHeight)
      let next = cur
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") next = cur + 1
      else if (e.key === "ArrowUp" || e.key === "PageUp") next = cur - 1
      else if (e.key === "Home") next = 0
      else if (e.key === "End") next = SLIDES - 1
      else return
      e.preventDefault()
      next = Math.max(0, Math.min(SLIDES - 1, next))
      deck.scrollTo({ top: next * window.innerHeight, behavior: "smooth" })
    }
    document.addEventListener("keydown", onKey)
    return () => {
      deck.removeEventListener("scroll", onScroll)
      document.removeEventListener("keydown", onKey)
    }
  }, [])

  function goTo(i: number) {
    const deck = deckRef.current
    if (!deck) return
    deck.scrollTo({ top: i * window.innerHeight, behavior: "smooth" })
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="__pdeck" ref={deckRef}>
        {/* 1 */}
        <section className="slide dark">
          <span className="slide-num">01 / 14</span>
          <div className="container">
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 48 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--jade)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia,serif", fontWeight: 700, color: "white" }}>N</div>
              <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: "0.06em" }}>NOCTUA PROPERTIES</span>
            </div>
            <h1 className="brand">La operación de tu cartera<br />de propiedades,<br />al fin en un solo lugar.</h1>
            <p className="lead" style={{ marginTop: 32 }}>
              SaaS multi-tenant para gestionar propiedades en renta y proyectos de construcción.
              Inquilinos, contratos, mantenimiento, pagos, autorizaciones, auditoría — todo conectado.
            </p>
            <div className="hero-stats">
              <div className="hero-stat"><div className="n">16</div><div className="l">Módulos</div></div>
              <div className="hero-stat"><div className="n">8</div><div className="l">Roles</div></div>
              <div className="hero-stat"><div className="n">100%</div><div className="l">Auditoría</div></div>
              <div className="hero-stat"><div className="n">0</div><div className="l">Hojas de cálculo</div></div>
            </div>
          </div>
        </section>

        {/* 2 */}
        <section className="slide alt">
          <span className="slide-num">02 / 14</span>
          <div className="container">
            <div className="eyebrow">El problema</div>
            <h2>Operar 5+ propiedades es un caos invisible.</h2>
            <div className="grid grid-3">
              <div className="card">
                <h3>Información dispersa</h3>
                <p style={{ color: "var(--gray-700)", fontSize: 15 }}>Contratos en PDF, pagos en Excel, mantenimiento en WhatsApp. Nadie sabe el estado real.</p>
              </div>
              <div className="card">
                <h3>Cero control financiero</h3>
                <p style={{ color: "var(--gray-700)", fontSize: 15 }}>Pagos a proveedores sin aprobación, fianzas olvidadas, vencimientos que llegan tarde.</p>
              </div>
              <div className="card">
                <h3>Sin trazabilidad</h3>
                <p style={{ color: "var(--gray-700)", fontSize: 15 }}>¿Quién autorizó ese pago de Q15,000? ¿Cuándo se reparó el aire? Nadie puede comprobarlo.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 3 */}
        <section className="slide dark">
          <span className="slide-num">03 / 14</span>
          <div className="container">
            <div className="eyebrow">La solución</div>
            <h2 className="brand">Una sola plataforma para<br />todo el ciclo de vida.</h2>
            <p className="lead">
              Desde el alta de la propiedad hasta el pago final al proveedor: cada acción queda
              registrada, autorizada y auditable. Tu equipo opera con permisos claros, y vos ves
              el estado real en tiempo real.
            </p>
            <div className="grid grid-2" style={{ marginTop: 48 }}>
              <div className="card">
                <span className="pill">Operación</span>
                <h3 style={{ marginTop: 12 }}>Propiedades · Inquilinos · Contratos · Pagos</h3>
                <p style={{ opacity: 0.7, fontSize: 15, marginTop: 8 }}>
                  Onboarding de propiedad en 2 minutos. Contratos con vencimiento automático.
                  Facturación mensual recurrente. Caja chica por propiedad con reposición autorizada.
                </p>
              </div>
              <div className="card">
                <span className="pill">Control</span>
                <h3 style={{ marginTop: 12 }}>Mantenimiento · Proyectos · Autorizaciones</h3>
                <p style={{ opacity: 0.7, fontSize: 15, marginTop: 8 }}>
                  Tickets con cotizaciones de varios proveedores. Aprobación obligatoria sobre Q1,000.
                  Aceptación de servicios antes del pago final. Audit trail completo.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4 */}
        <section className="slide alt">
          <span className="slide-num">04 / 14</span>
          <div className="container">
            <div className="eyebrow">Lo que incluye</div>
            <h2>16 módulos integrados, no 16 sistemas separados.</h2>
            <div className="module-grid">
              {[
                ["Dashboard", "vista ejecutiva"],
                ["Propiedades", "portafolio + fotos"],
                ["Inquilinos", "contactos + historial"],
                ["Contratos", "vencimientos automáticos"],
                ["Pagos y Facturas", "recurrentes + mora"],
                ["Caja Chica", "por propiedad, autorizada"],
                ["Mantenimiento", "tickets + cotizaciones"],
                ["Activos", "seguros, garantías, IUSI"],
                ["Proyectos", "partidas + presupuesto"],
                ["Proveedores", "estados de cuenta"],
                ["Cotizaciones", "comparativo + audit"],
                ["Empleados", "asignación + horas"],
                ["Autorizaciones", "aprobar / co-firmar"],
                ["Aceptaciones", "checklist + foto"],
                ["Reportes", "cuentas + auditoría"],
                ["Configuración", "usuarios + reglas"],
              ].map(([n, d]) => (
                <div key={n} className="module-tile">{n}<small>{d}</small></div>
              ))}
            </div>
          </div>
        </section>

        {/* 5 */}
        <section className="slide dark">
          <span className="slide-num">05 / 14</span>
          <div className="container">
            <div className="eyebrow">Permisos por rol</div>
            <h2 className="brand">8 roles preconfigurados.<br />Cada uno ve lo que debe ver.</h2>
            <p className="lead">Permisos definidos a nivel de módulo y acción (ver, crear, editar, eliminar). Más filtro por propiedad: un encargado solo ve los datos de las fincas que tiene asignadas.</p>
            <div className="role-grid">
              {[
                ["Propietario", "Control total. Una sola organización tiene 1+ propietarios."],
                ["Administrador", "Gestiona usuarios, reglas y operación completa."],
                ["Gerente", "Crea y edita todo, no elimina datos críticos."],
                ["Contador", "Ve y registra movimientos financieros. No opera propiedades."],
                ["Encargado", "Solo opera sus propiedades asignadas (filtro automático)."],
                ["Asistente", "Crea datos pero no aprueba pagos ni elimina."],
                ["Técnico", "Solo ve mantenimiento y activos."],
                ["Solo lectura", "Para auditores, contadores externos, propietarios pasivos."],
              ].map(([n, d]) => (
                <div key={n} className="role">
                  <div className="name"><span className="dot"></span>{n}</div>
                  <div className="desc">{d}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6 */}
        <section className="slide jade">
          <span className="slide-num">06 / 14</span>
          <div className="container">
            <div className="eyebrow" style={{ color: "rgba(255,255,255,0.85)" }}>Diferenciador clave</div>
            <h2 className="brand" style={{ color: "white" }}>Cap del 80% antes del pago final.</h2>
            <p className="lead" style={{ color: "rgba(255,255,255,0.92)", maxWidth: 780 }}>
              Nadie cobra el 100% sin que alguien autorizado firme que el servicio se entregó.
              Sistema configurable, con hash de verificación y versión bloqueada para que el
              contexto no se pueda alterar después.
            </p>
            <div className="grid grid-3" style={{ marginTop: 48 }}>
              {[
                ["80%", "Cap por defecto antes de aceptación. Configurable por organización."],
                ["SHA-256", "Hash del contexto al momento de aprobar. Detecta manipulación posterior."],
                ["Checklist", "El que acepta confirma punto por punto, sube fotos, califica al proveedor."],
              ].map(([title, body]) => (
                <div key={title} style={{ padding: 24, background: "rgba(0,0,0,0.18)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)" }}>
                  <div style={{ fontFamily: "Georgia,serif", fontSize: 36, fontWeight: 600 }}>{title}</div>
                  <div style={{ marginTop: 6, opacity: 0.85 }}>{body}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7 */}
        <section className="slide alt">
          <span className="slide-num">07 / 14</span>
          <div className="container">
            <div className="eyebrow">Control financiero</div>
            <h2>Sin autorización no hay pago.</h2>
            <p className="lead" style={{ color: "var(--gray-700)" }}>
              Pagos sobre umbrales configurables disparan flujo de aprobación. Usuarios sensibles
              requieren co-firma (dos personas), bloqueando que cualquiera apruebe solo.
            </p>
            <div className="grid grid-2" style={{ marginTop: 36 }}>
              <div className="card">
                <h3>Política de autoridad por usuario</h3>
                <div className="check">Sin autoridad — no puede aprobar nada</div>
                <div className="check">Firma sola — aprueba directo, queda en audit log</div>
                <div className="check">Requiere co-firma — necesita otra persona designada</div>
              </div>
              <div className="card">
                <h3>Anti-conflicto de interés</h3>
                <div className="check">El que pide el pago no puede aprobarlo</div>
                <div className="check">El que cotiza no puede ser quien lo selecciona</div>
                <div className="check">El que aprueba no puede aceptar el servicio</div>
                <div className="check">Cada decisión firmada con timestamp</div>
              </div>
            </div>
          </div>
        </section>

        {/* 8 */}
        <section className="slide dark">
          <span className="slide-num">08 / 14</span>
          <div className="container">
            <div className="eyebrow">Auditoría completa</div>
            <h2 className="brand">Cada acción queda registrada.<br />Forever.</h2>
            <p className="lead">
              Log de actividad inmutable: quién hizo qué, cuándo, sobre qué entidad, con qué metadata.
              Reportes filtrables por usuario, módulo, fecha. Listo para auditoría interna o externa.
            </p>
            <table>
              <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Monto</th></tr></thead>
              <tbody>
                <tr><td>23/05 10:42</td><td>María L.</td><td>Aprobó pago</td><td>Partida E001</td><td>Q 12,500</td></tr>
                <tr><td>23/05 10:38</td><td>Juan P.</td><td>Solicitó autorización</td><td>Partida E001</td><td>Q 12,500</td></tr>
                <tr><td>23/05 09:15</td><td>Carlos M.</td><td>Aceptó servicio</td><td>Ticket M-2026-T08</td><td>—</td></tr>
                <tr><td>22/05 16:20</td><td>María L.</td><td>Creó contrato</td><td>Edificio Reforma · Apt 4B</td><td>Q 8,500/mes</td></tr>
                <tr><td>22/05 14:55</td><td>Pedro G.</td><td>Registró pago</td><td>Caja Chica · La Antigua</td><td>Q 450</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 9 */}
        <section className="slide alt">
          <span className="slide-num">09 / 14</span>
          <div className="container">
            <div className="eyebrow">Seguridad y aislamiento</div>
            <h2>Multi-tenant real. Tu data, tuya.</h2>
            <div className="grid grid-2">
              <div className="card">
                <h3>Aislamiento por organización</h3>
                <div className="check">Cada query lleva organizationId en el WHERE</div>
                <div className="check">Imposible ver datos de otra empresa, ni accidentalmente</div>
                <div className="check">Defense-in-depth en todas las server actions</div>
              </div>
              <div className="card">
                <h3>Autenticación robusta</h3>
                <div className="check">Contraseñas con bcrypt cost 12</div>
                <div className="check">JWT firmado con secreto rotable</div>
                <div className="check">Cambio forzado de password en primer login</div>
                <div className="check">Reset por email con tokens de 1 hora</div>
              </div>
              <div className="card">
                <h3>Anti brute-force</h3>
                <div className="check">Rate limiting por IP+email en login</div>
                <div className="check">Anti-enumeration en password reset</div>
                <div className="check">Tokens single-use, invalidación al usar</div>
              </div>
              <div className="card">
                <h3>Auditoría y compliance</h3>
                <div className="check">Log inmutable de cada mutación</div>
                <div className="check">Hash de aceptaciones detecta manipulación</div>
                <div className="check">Backups automáticos diarios</div>
              </div>
            </div>
          </div>
        </section>

        {/* 10 */}
        <section className="slide dark">
          <span className="slide-num">10 / 14</span>
          <div className="container">
            <div className="eyebrow">Empezar es simple</div>
            <h2 className="brand">De cero a operando<br />en menos de 10 minutos.</h2>
            <div className="grid grid-3" style={{ marginTop: 48 }}>
              {[
                ["01", "Crear cuenta", "Signup público en /signup. Llenás datos de empresa + administrador. La organización queda creada con configuración base lista."],
                ["02", "Invitar equipo", "Configuración → Usuarios → Invitar. Asignás rol y propiedades específicas. El sistema te muestra qué módulos verá cada uno."],
                ["03", "Cargar portafolio", "Propiedades → Nueva. Importás datos básicos, contratos vigentes, proveedores habituales. En paralelo el equipo empieza a operar."],
              ].map(([n, title, body]) => (
                <div key={n} className="card">
                  <span className="num">{n}</span>
                  <h3>{title}</h3>
                  <p style={{ opacity: 0.75, fontSize: 14, marginTop: 6 }}>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 11 */}
        <section className="slide alt">
          <span className="slide-num">11 / 14</span>
          <div className="container">
            <div className="eyebrow">Trabaja desde donde estés</div>
            <h2>Mobile-first. iOS y Android sin app que instalar.</h2>
            <p className="lead" style={{ color: "var(--gray-700)" }}>
              Toda la operación se hace desde el navegador del celular. El encargado registra
              mantenimiento desde la propiedad, el técnico sube fotos del trabajo terminado,
              el dueño aprueba pagos desde donde sea.
            </p>
            <div className="grid grid-3" style={{ marginTop: 32 }}>
              <div className="card"><h3>Responsive total</h3><p style={{ color: "var(--gray-700)", fontSize: 14 }}>Sidebar plegable, tabs scrollables, formularios adaptados.</p></div>
              <div className="card"><h3>Fotos desde el campo</h3><p style={{ color: "var(--gray-700)", fontSize: 14 }}>Subí fotos de fallas, recibos y trabajo terminado desde la cámara del teléfono.</p></div>
              <div className="card"><h3>Sin app que mantener</h3><p style={{ color: "var(--gray-700)", fontSize: 14 }}>Web app moderna. Cero fricción de instalar/actualizar para tu equipo.</p></div>
            </div>
          </div>
        </section>

        {/* 12 */}
        <section className="slide dark">
          <span className="slide-num">12 / 14</span>
          <div className="container">
            <div className="eyebrow">Construido sobre tecnología sólida</div>
            <h2 className="brand">Stack moderno.<br />Escalable, mantenible, seguro.</h2>
            <div className="grid grid-2" style={{ marginTop: 36 }}>
              <div>
                <h3>Frontend</h3>
                <div className="stack">
                  <span>Next.js 16</span><span>React 19</span><span>TypeScript</span>
                  <span>Tailwind CSS</span><span>Radix UI</span>
                </div>
                <h3 style={{ marginTop: 28 }}>Backend</h3>
                <div className="stack">
                  <span>Prisma 6</span><span>PostgreSQL</span><span>NextAuth v5</span>
                  <span>Server Actions</span><span>bcrypt</span>
                </div>
              </div>
              <div>
                <h3>Infraestructura</h3>
                <div className="stack">
                  <span>Vercel</span><span>Supabase</span><span>Resend</span>
                  <span>Upstash</span><span>Sentry</span>
                </div>
                <h3 style={{ marginTop: 28 }}>Calidad</h3>
                <div className="stack">
                  <span>130+ tests</span><span>Type safety</span><span>CI automatizado</span>
                  <span>Defense-in-depth</span><span>Audit trail</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 13 — PRICING SINGLE */}
        <section className="slide alt">
          <span className="slide-num">13 / 14</span>
          <div className="container">
            <div className="eyebrow">Precio</div>
            <h2>Un plan. Todo incluido. Sin sorpresas.</h2>
            <p style={{ color: "var(--gray-700)", maxWidth: 680 }}>
              Pagás por tu organización, no por usuario. Crecé sin que el costo se dispare.
            </p>
            <div className="price-single">
              <div className="tier">Plan único</div>
              <div className="amount">Q 995<small>/ mes</small></div>
              <ul>
                <li>Propiedades ilimitadas</li>
                <li>Usuarios ilimitados</li>
                <li>Los 16 módulos completos</li>
                <li>Aceptación de servicios + cap 80%</li>
                <li>Autorizaciones + co-firma</li>
                <li>Auditoría completa + reportes</li>
                <li>Multi-tenant + filtro por propiedad</li>
                <li>Backups diarios automáticos</li>
                <li>Soporte por email</li>
                <li>14 días de prueba gratis</li>
              </ul>
              <a className="btn" href="/signup">Empezar ahora</a>
            </div>
            <p style={{ color: "var(--gray-500)", fontSize: 13, marginTop: 24 }}>
              * Precio en quetzales, sin IVA. Sin contratos de permanencia.
            </p>
          </div>
        </section>

        {/* 14 — CTA */}
        <section className="slide jade">
          <span className="slide-num">14 / 14</span>
          <div className="container">
            <div className="eyebrow" style={{ color: "rgba(255,255,255,0.85)" }}>Próximos pasos</div>
            <h2 className="brand" style={{ color: "white", fontSize: "clamp(36px, 5vw, 56px)" }}>
              Probalo con tu portafolio.<br />Sin compromiso.
            </h2>
            <p className="lead" style={{ color: "rgba(255,255,255,0.92)", marginTop: 24 }}>
              14 días gratis. Cargás 1 o 2 propiedades tuyas, jugás con el equipo, y decidís.
              Si no te sirve, no pagás nada. Tu data se queda con vos, exportable.
            </p>
            <div style={{ marginTop: 40, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a className="cta" style={{ background: "white", color: "var(--jade)" }} href="/signup">Crear cuenta gratis</a>
              <a className="cta" style={{ background: "transparent", color: "white", border: "1px solid rgba(255,255,255,0.4)" }} href="mailto:hola@noctuapo.com">Agendar demo</a>
            </div>
            <div className="quote" style={{ marginTop: 64, color: "rgba(255,255,255,0.9)", borderColor: "rgba(255,255,255,0.5)" }}>
              "Operar 30 propiedades dejó de ser un caos de hojas de cálculo."
              <div style={{ fontSize: 13, fontStyle: "normal", opacity: 0.7, marginTop: 10 }}>— Cliente piloto, Ciudad de Guatemala</div>
            </div>
          </div>
        </section>

        <div className="dots">
          {Array.from({ length: SLIDES }).map((_, i) => (
            <a
              key={i}
              href={`#s${i + 1}`}
              className={i === active ? "active" : ""}
              onClick={(e) => { e.preventDefault(); goTo(i) }}
              title={`Slide ${i + 1}`}
            />
          ))}
        </div>
        <div className="nav-help">↑ ↓ flechas · scroll · espacio</div>
        <div className="footer-bar">Noctua Properties · noctuapo.com</div>
      </div>
    </>
  )
}
