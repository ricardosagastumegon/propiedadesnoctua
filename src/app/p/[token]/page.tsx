import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatGTQ } from "@/lib/format"
import { formatAreaUnits, isValidPolygon, type LatLng } from "@/lib/geo"
import { PROPERTY_TYPES, PROPERTY_STATUSES } from "@/lib/schemas/property"
import { PublicMap, type PublicMapShape } from "./_public-map"
import { MapPin, Bed, Bath, Maximize, Building2 } from "lucide-react"

export const dynamic = "force-dynamic"

async function getProperty(token: string) {
  if (!token) return null
  return prisma.property.findUnique({
    where: { publicShareToken: token },
    select: {
      id: true, name: true, alias: true, type: true, status: true,
      city: true, department: true, zone: true,
      latitude: true, longitude: true, mapPolygon: true,
      bedrooms: true, bathrooms: true, parkingSpaces: true,
      totalArea: true, builtArea: true, currentValue: true,
      coverImageUrl: true, galleryUrls: true, notes: true,
      organization: { select: { name: true } },
      parcels: { select: { id: true, name: true, cadastralNumber: true, mapPolygon: true, areaHectares: true } },
    },
  })
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  const p = await getProperty(token)
  if (!p) return { title: "Propiedad no encontrada" }
  const where = [p.zone, p.city, p.department].filter(Boolean).join(", ")
  const desc = `${PROPERTY_TYPES[p.type] ?? p.type} en ${where}. ${PROPERTY_STATUSES[p.status] ?? ""}`.trim()
  return {
    title: `${p.name} — Noctua Propiedades`,
    description: desc,
    openGraph: {
      title: p.name,
      description: desc,
      images: p.coverImageUrl ? [{ url: p.coverImageUrl }] : [],
      type: "website",
    },
  }
}

export default async function PublicPropertyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const p = await getProperty(token)
  if (!p) notFound()

  const typeLabel = PROPERTY_TYPES[p.type] ?? p.type
  const statusLabel = PROPERTY_STATUSES[p.status] ?? p.status
  const where = [p.zone, p.city, p.department].filter(Boolean).join(", ")

  // Predios con contorno → mapa; si no, polígono propio; si no, pin
  const parcelShapes: PublicMapShape[] = p.parcels
    .map(pc => ({
      id: pc.id,
      label: pc.name || pc.cadastralNumber || "Predio",
      polygon: isValidPolygon(pc.mapPolygon) ? (pc.mapPolygon as LatLng[]) : null,
      point: null as LatLng | null,
    }))
    .filter(s => s.polygon !== null)

  const shapes: PublicMapShape[] = parcelShapes.length > 0
    ? parcelShapes
    : isValidPolygon(p.mapPolygon)
      ? [{ id: p.id, label: p.name, polygon: p.mapPolygon as LatLng[], point: null }]
      : (p.latitude != null && p.longitude != null)
        ? [{ id: p.id, label: p.name, polygon: null, point: [p.latitude, p.longitude] }]
        : []

  const totalParcelHa = p.parcels.reduce((s, pc) => s + (pc.areaHectares ?? 0), 0)

  const statusColors: Record<string, string> = {
    AVAILABLE: "bg-emerald-100 text-emerald-800",
    RENTED: "bg-blue-100 text-blue-800",
    FOR_SALE: "bg-purple-100 text-purple-800",
    SOLD: "bg-gray-200 text-gray-600",
    MAINTENANCE: "bg-amber-100 text-amber-800",
    INACTIVE: "bg-gray-100 text-gray-500",
  }

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#2D2D2D]">
      <header className="bg-white border-b border-[#E3DFD6]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#2D2D2D] text-white flex items-center justify-center font-serif text-sm" style={{ fontFamily: "Georgia, serif" }}>N</div>
          <span className="text-sm font-medium">{p.organization?.name ?? "Noctua"}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Foto / portada */}
        <div className="rounded-xl overflow-hidden border border-[#E3DFD6] bg-white">
          {p.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.coverImageUrl} alt={p.name} className="w-full aspect-[16/9] object-cover" />
          ) : (
            <div className="w-full aspect-[16/9] bg-[#F2EFE7] flex items-center justify-center">
              <Building2 className="size-12 text-[#C9C5BC]" />
            </div>
          )}
        </div>

        {/* Título + estado */}
        <div className="mt-5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#F2EFE7] text-[#4A4A4A]">{typeLabel}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[p.status] ?? "bg-gray-100 text-gray-600"}`}>{statusLabel}</span>
          </div>
          <h1 className="font-serif text-3xl tracking-tight mt-2" style={{ fontFamily: "Georgia, serif" }}>{p.name}</h1>
          {p.alias && <p className="text-sm text-[#767676]">{p.alias}</p>}
          {where && (
            <p className="flex items-center gap-1.5 text-sm text-[#4A4A4A] mt-1">
              <MapPin className="size-4" /> {where}
            </p>
          )}
          {p.currentValue != null && (
            <div className="mt-3 font-serif text-2xl" style={{ fontFamily: "Georgia, serif" }}>{formatGTQ(p.currentValue)}</div>
          )}
        </div>

        {/* Características */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {p.bedrooms != null && <Stat icon={<Bed className="size-4" />} label="Habitaciones" value={String(p.bedrooms)} />}
          {p.bathrooms != null && <Stat icon={<Bath className="size-4" />} label="Baños" value={String(p.bathrooms)} />}
          {p.parkingSpaces != null && <Stat icon={<Maximize className="size-4" />} label="Parqueos" value={String(p.parkingSpaces)} />}
          {p.builtArea != null && <Stat icon={<Maximize className="size-4" />} label="Construido" value={`${p.builtArea} m²`} />}
        </div>

        {/* Área en unidades GT */}
        {(totalParcelHa > 0 || p.totalArea != null) && (
          <div className="mt-4 bg-white border border-[#E3DFD6] rounded-xl p-4">
            <div className="text-xs uppercase tracking-wider text-[#767676] mb-1">Área del terreno</div>
            <div className="text-lg font-medium">
              {totalParcelHa > 0 ? formatAreaUnits(totalParcelHa) : `${p.totalArea} m²`}
            </div>
          </div>
        )}

        {/* Galería de fotos */}
        {p.galleryUrls.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {p.galleryUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt={`foto ${i + 1}`} className="w-full aspect-[4/3] object-cover rounded-lg border border-[#E3DFD6]" />
            ))}
          </div>
        )}

        {/* Mapa */}
        {shapes.length > 0 && (
          <div className="mt-4 rounded-xl overflow-hidden border border-[#E3DFD6]">
            <PublicMap shapes={shapes} />
          </div>
        )}

        {/* Predios */}
        {p.parcels.length > 0 && (
          <div className="mt-4 bg-white border border-[#E3DFD6] rounded-xl p-4">
            <div className="text-xs uppercase tracking-wider text-[#767676] mb-2">Predios / Catastros ({p.parcels.length})</div>
            <ul className="space-y-1.5">
              {p.parcels.map(pc => (
                <li key={pc.id} className="text-sm flex justify-between gap-3">
                  <span>{pc.name || pc.cadastralNumber || "Predio"}{pc.cadastralNumber && pc.name ? ` · ${pc.cadastralNumber}` : ""}</span>
                  <span className="text-[#767676]">{pc.areaHectares ? formatAreaUnits(pc.areaHectares) : ""}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {p.notes && (
          <div className="mt-4 bg-white border border-[#E3DFD6] rounded-xl p-4">
            <div className="text-xs uppercase tracking-wider text-[#767676] mb-1">Descripción</div>
            <p className="text-sm whitespace-pre-wrap text-[#4A4A4A]">{p.notes}</p>
          </div>
        )}

        <p className="text-center text-xs text-[#767676] mt-8 pb-8">
          Ficha compartida vía <strong>Noctua Propiedades</strong> · noctuapo.com
        </p>
      </main>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white border border-[#E3DFD6] rounded-xl p-3 text-center">
      <div className="flex items-center justify-center text-[#3F8E5C] mb-1">{icon}</div>
      <div className="text-lg font-medium leading-none">{value}</div>
      <div className="text-[11px] text-[#767676] mt-1">{label}</div>
    </div>
  )
}
