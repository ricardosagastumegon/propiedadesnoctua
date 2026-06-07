import Link from "next/link"
import { auth } from "@/auth"

export const dynamic = "force-dynamic"

function Owl({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 800" fill="none" stroke="#C9A24B" strokeWidth={16}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <g transform="translate(115,0) scale(0.8)">
        <path d="M 290 400 C 276 345, 278 285, 296 232 C 305 200, 318 180, 332 182 C 339 196, 345 218, 350 240 C 367 248, 385 248, 400 244 C 415 248, 433 248, 450 240 C 455 218, 461 196, 468 182 C 482 180, 495 200, 504 232 C 522 285, 524 345, 510 400 C 548 448, 566 532, 566 626 C 566 730, 532 808, 476 850 C 444 868, 412 873, 400 873 C 388 873, 356 868, 324 850 C 268 808, 234 730, 234 626 C 234 532, 252 448, 290 400 Z"/>
        <path d="M 326 296 Q 356 308, 390 296"/><path d="M 410 296 Q 444 308, 474 296"/>
        <path d="M 397 364 L 400 388 L 403 364 Z"/>
        <path d="M 400 460 Q 398 600, 400 740 Q 400 810, 400 855"/>
      </g>
    </svg>
  )
}

export default async function Home() {
  const session = await auth()
  const isAuthed = !!session?.user

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-[#12182A]">
      <header className="border-b border-[#E7E9EE] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0D1322] flex items-center justify-center">
              <Owl className="w-7 h-7" />
            </div>
            <div>
              <div className="font-display text-base tracking-[0.14em] leading-tight">NOCTUA</div>
              <div className="text-[10px] text-[#8A6A2E] tracking-[0.2em] uppercase leading-tight font-semibold">Tu Propiedad</div>
            </div>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/presentaciones" className="text-sm text-[#475065] hover:text-[#12182A] hidden sm:inline">
              Presentación
            </Link>
            {isAuthed ? (
              <Link href="/dashboard" className="text-sm font-semibold bg-[#12182A] text-[#F4EFE6] px-4 py-2 rounded-lg hover:bg-[#1B2942]">
                Ir al panel
              </Link>
            ) : (
              <Link href="/login" className="text-sm font-semibold bg-[#12182A] text-[#F4EFE6] px-4 py-2 rounded-lg hover:bg-[#1B2942]">
                Ingresar
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
          <div className="max-w-3xl">
            <span className="text-xs tracking-[0.2em] uppercase text-[#8A6A2E] font-semibold">Dos sistemas. Una sola visión.</span>
            <h1 className="font-display text-4xl sm:text-6xl tracking-tight leading-[1.05] mt-4">
              La operación de tu empresa,<br />al fin en orden.
            </h1>
            <p className="text-lg text-[#475065] mt-6 max-w-2xl leading-relaxed">
              Noctua desarrolla plataformas para gestionar todo lo que mueve tu patrimonio:
              propiedades, contratos, mantenimiento, autorizaciones y trazabilidad financiera.
              Elegí el sistema que necesitás.
            </p>
          </div>
        </section>

        {/* PRODUCTS */}
        <section className="max-w-6xl mx-auto px-6 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* PROPERTIES */}
            <div className="bg-white border border-[#E7E9EE] rounded-2xl p-7 shadow-sm flex flex-col">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0D1322] flex items-center justify-center"><Owl className="w-7 h-7" /></div>
                <span className="text-xs tracking-widest uppercase text-[#8A6A2E] font-semibold">Disponible</span>
              </div>
              <h2 className="font-display text-2xl tracking-tight mt-5">Noctua Properties</h2>
              <p className="text-sm text-[#475065] mt-2 leading-relaxed">
                Gestión integral de propiedades y fincas: inquilinos, contratos, pagos,
                mantenimiento, proyectos, caja chica y autorizaciones. Multi-tenant con roles,
                mapa con catastro y aceptación de servicios antes del pago final.
              </p>
              <ul className="text-sm text-[#475065] mt-5 space-y-1.5">
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#B68A3E] flex-shrink-0"></span>16 módulos integrados</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#B68A3E] flex-shrink-0"></span>8 roles con permisos granulares</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#B68A3E] flex-shrink-0"></span>Mapa con catastro RIC y contorno legal vs real</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#B68A3E] flex-shrink-0"></span>Auditoría completa</li>
              </ul>
              <div className="mt-6 flex items-center gap-3 pt-5 border-t border-[#EEF0F4]">
                {isAuthed ? (
                  <Link href="/dashboard" className="bg-[#12182A] text-[#F4EFE6] text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#1B2942]">
                    Abrir Properties
                  </Link>
                ) : (
                  <Link href="/signup" className="bg-[#12182A] text-[#F4EFE6] text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#1B2942]">
                    Empezar gratis
                  </Link>
                )}
                <Link href="/presentaciones" className="text-sm text-[#8A6A2E] hover:underline font-semibold">
                  Ver presentación →
                </Link>
              </div>
            </div>

            {/* CEA */}
            <div className="bg-white border border-[#E7E9EE] rounded-2xl p-7 shadow-sm flex flex-col">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0D1322] text-[#C9A24B] flex items-center justify-center font-display text-lg">C</div>
                <span className="text-xs tracking-widest uppercase text-[#8A6A2E] font-semibold">Disponible</span>
              </div>
              <h2 className="font-display text-2xl tracking-tight mt-5">Noctua CEA</h2>
              <p className="text-sm text-[#475065] mt-2 leading-relaxed">
                Sistema CEA — gestión especializada para tu operación. Diseñado para equipos
                que necesitan control, trazabilidad y reportería en su flujo diario.
              </p>
              <ul className="text-sm text-[#475065] mt-5 space-y-1.5">
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#B68A3E] flex-shrink-0"></span>Acceso por usuario</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#B68A3E] flex-shrink-0"></span>Operación mobile-first</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#B68A3E] flex-shrink-0"></span>Reportes en tiempo real</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#B68A3E] flex-shrink-0"></span>Soporte dedicado</li>
              </ul>
              <div className="mt-6 flex items-center gap-3 pt-5 border-t border-[#EEF0F4]">
                <a href="https://cea.noctuapo.com"
                  className="border border-[#12182A] text-[#12182A] text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#12182A] hover:text-[#F4EFE6] transition-colors">
                  Abrir CEA
                </a>
                <span className="text-xs text-[#6B7280]">cea.noctuapo.com</span>
              </div>
            </div>

          </div>
        </section>

        {/* WHY */}
        <section className="bg-white border-y border-[#E7E9EE]">
          <div className="max-w-6xl mx-auto px-6 py-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="font-display text-3xl text-[#8A6A2E]">100%</div>
                <div className="text-sm text-[#475065] mt-1">Auditoría: cada acción registrada con quién, qué, cuándo.</div>
              </div>
              <div>
                <div className="font-display text-3xl text-[#8A6A2E]">Multi-tenant</div>
                <div className="text-sm text-[#475065] mt-1">Tu data jamás se mezcla con la de otras empresas.</div>
              </div>
              <div>
                <div className="font-display text-3xl text-[#8A6A2E]">Mobile-first</div>
                <div className="text-sm text-[#475065] mt-1">iOS y Android sin app que instalar. Funciona en cualquier navegador.</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E7E9EE] bg-[#F6F7F9]">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-[#6B7280]">© 2026 Noctua · noctuapo.com</div>
          <div className="flex items-center gap-5 text-xs text-[#475065]">
            <Link href="/presentaciones" className="hover:text-[#12182A]">Presentación</Link>
            <a href="mailto:hola@noctuapo.com" className="hover:text-[#12182A]">hola@noctuapo.com</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
