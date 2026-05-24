import Link from "next/link"
import { auth } from "@/auth"

export const dynamic = "force-dynamic"

export default async function Home() {
  const session = await auth()
  const isAuthed = !!session?.user

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#2D2D2D]">
      <header className="border-b border-[#E3DFD6] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-[#2D2D2D] text-white flex items-center justify-center font-display text-lg">N</div>
            <div>
              <div className="font-display text-base tracking-tight leading-tight">Noctua</div>
              <div className="text-[10px] text-[#6B6B6B] tracking-widest uppercase leading-tight">Sistemas de gestión</div>
            </div>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/presentaciones" className="text-sm text-[#4A4A4A] hover:text-[#2D2D2D] hidden sm:inline">
              Presentación
            </Link>
            {isAuthed ? (
              <Link href="/dashboard" className="text-sm font-medium bg-[#2D2D2D] text-white px-4 py-2 rounded-md hover:bg-black">
                Ir al panel
              </Link>
            ) : (
              <Link href="/login" className="text-sm font-medium bg-[#2D2D2D] text-white px-4 py-2 rounded-md hover:bg-black">
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
            <span className="text-xs tracking-widest uppercase text-[#3F8E5C] font-semibold">Dos sistemas. Una sola visión.</span>
            <h1 className="font-display text-4xl sm:text-6xl tracking-tight leading-[1.05] mt-4">
              La operación de tu empresa,<br />al fin en orden.
            </h1>
            <p className="text-lg text-[#4A4A4A] mt-6 max-w-2xl leading-relaxed">
              Noctua desarrolla plataformas SaaS para gestionar todo lo que mueve una empresa:
              propiedades, contratos, mantenimiento, autorizaciones y trazabilidad financiera.
              Eligí el sistema que necesitás.
            </p>
          </div>
        </section>

        {/* PRODUCTS */}
        <section className="max-w-6xl mx-auto px-6 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* PROPERTIES */}
            <div className="bg-white border border-[#E3DFD6] rounded-2xl p-7 shadow-sm flex flex-col">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#2D2D2D] text-white flex items-center justify-center font-display">P</div>
                <span className="text-xs tracking-widest uppercase text-[#6B6B6B] font-semibold">Disponible</span>
              </div>
              <h2 className="font-display text-2xl tracking-tight mt-5">Noctua Properties</h2>
              <p className="text-sm text-[#4A4A4A] mt-2 leading-relaxed">
                Gestión integral de propiedades en renta: inquilinos, contratos, pagos,
                mantenimiento, proyectos, caja chica y autorizaciones. Multi-tenant con roles
                y aceptación de servicios antes del pago final.
              </p>
              <ul className="text-sm text-[#4A4A4A] mt-5 space-y-1.5">
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#3F8E5C] flex-shrink-0"></span>16 módulos integrados</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#3F8E5C] flex-shrink-0"></span>8 roles con permisos granulares</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#3F8E5C] flex-shrink-0"></span>Cap del 80% antes de aceptación</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#3F8E5C] flex-shrink-0"></span>Auditoría completa</li>
              </ul>
              <div className="mt-6 flex items-center gap-3 pt-5 border-t border-[#F2EFE7]">
                {isAuthed ? (
                  <Link href="/dashboard" className="bg-[#3F8E5C] text-white text-sm font-medium px-5 py-2.5 rounded-md hover:bg-[#358050]">
                    Abrir Properties
                  </Link>
                ) : (
                  <Link href="/signup" className="bg-[#3F8E5C] text-white text-sm font-medium px-5 py-2.5 rounded-md hover:bg-[#358050]">
                    Empezar gratis
                  </Link>
                )}
                <Link href="/presentaciones" className="text-sm text-[#4A4A4A] hover:text-[#2D2D2D] font-medium">
                  Ver presentación →
                </Link>
              </div>
            </div>

            {/* CEA */}
            <div className="bg-white border border-[#E3DFD6] rounded-2xl p-7 shadow-sm flex flex-col">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#3F8E5C] text-white flex items-center justify-center font-display">C</div>
                <span className="text-xs tracking-widest uppercase text-[#6B6B6B] font-semibold">Disponible</span>
              </div>
              <h2 className="font-display text-2xl tracking-tight mt-5">Noctua CEA</h2>
              <p className="text-sm text-[#4A4A4A] mt-2 leading-relaxed">
                Sistema CEA — gestión especializada para tu operación. Diseñado para equipos
                que necesitan control, trazabilidad y reportería en su flujo diario.
              </p>
              <ul className="text-sm text-[#4A4A4A] mt-5 space-y-1.5">
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#3F8E5C] flex-shrink-0"></span>Acceso por usuario</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#3F8E5C] flex-shrink-0"></span>Operación mobile-first</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#3F8E5C] flex-shrink-0"></span>Reportes en tiempo real</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#3F8E5C] flex-shrink-0"></span>Soporte dedicado</li>
              </ul>
              <div className="mt-6 flex items-center gap-3 pt-5 border-t border-[#F2EFE7]">
                <a
                  href="https://cea.noctuapo.com"
                  className="bg-[#2D2D2D] text-white text-sm font-medium px-5 py-2.5 rounded-md hover:bg-black"
                >
                  Abrir CEA
                </a>
                <span className="text-xs text-[#6B6B6B]">cea.noctuapo.com</span>
              </div>
            </div>

          </div>
        </section>

        {/* WHY */}
        <section className="bg-white border-y border-[#E3DFD6]">
          <div className="max-w-6xl mx-auto px-6 py-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="font-display text-3xl text-[#3F8E5C]">100%</div>
                <div className="text-sm text-[#4A4A4A] mt-1">Auditoría: cada acción registrada con quién, qué, cuándo.</div>
              </div>
              <div>
                <div className="font-display text-3xl text-[#3F8E5C]">Multi-tenant</div>
                <div className="text-sm text-[#4A4A4A] mt-1">Tu data jamás se mezcla con la de otras empresas.</div>
              </div>
              <div>
                <div className="font-display text-3xl text-[#3F8E5C]">Mobile-first</div>
                <div className="text-sm text-[#4A4A4A] mt-1">iOS y Android sin app que instalar. Funciona en cualquier navegador.</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E3DFD6] bg-[#FAF8F4]">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-[#6B6B6B]">© 2026 Noctua · noctuapo.com</div>
          <div className="flex items-center gap-5 text-xs text-[#4A4A4A]">
            <Link href="/presentaciones" className="hover:text-[#2D2D2D]">Presentación</Link>
            <a href="mailto:hola@noctuapo.com" className="hover:text-[#2D2D2D]">hola@noctuapo.com</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
