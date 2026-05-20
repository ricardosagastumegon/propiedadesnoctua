import Link from "next/link"
import { Phone, Mail, Star, MapPin, Briefcase } from "lucide-react"

export interface VendorLike {
  id: string
  name: string
  category?: string | null
  contactName?: string | null
  phone?: string | null
  email?: string | null
  rating?: number | null
  address?: string | null
}

interface Props {
  vendor: VendorLike
  variant?: "compact" | "expanded"
  href?: string  // optional override; defaults to /proveedores/[id]
  className?: string
}

export function VendorCard({ vendor, variant = "compact", href, className = "" }: Props) {
  const link = href ?? `/proveedores/${vendor.id}`

  if (variant === "compact") {
    return (
      <Link href={link} className={`inline-flex items-center gap-2 text-sm hover:underline group ${className}`}>
        <span className="font-medium group-hover:text-foreground">{vendor.name}</span>
        {vendor.phone && (
          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
            <Phone className="size-3" />{vendor.phone}
          </span>
        )}
        {vendor.rating != null && (
          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
            <Star className="size-3 fill-amber-400 text-amber-400" />{vendor.rating.toFixed(1)}
          </span>
        )}
      </Link>
    )
  }

  // expanded
  return (
    <div className={`border rounded-lg p-3 space-y-2 ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <Link href={link} className="font-medium hover:underline">{vendor.name}</Link>
        {vendor.rating != null && (
          <span className="text-xs flex items-center gap-0.5 shrink-0">
            <Star className="size-3 fill-amber-400 text-amber-400" />{vendor.rating.toFixed(1)}
          </span>
        )}
      </div>
      {vendor.category && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Briefcase className="size-3" />{vendor.category}
        </p>
      )}
      {vendor.contactName && (
        <p className="text-xs">Contacto: <span className="font-medium">{vendor.contactName}</span></p>
      )}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {vendor.phone && <span className="flex items-center gap-1"><Phone className="size-3" />{vendor.phone}</span>}
        {vendor.email && <span className="flex items-center gap-1"><Mail className="size-3" />{vendor.email}</span>}
        {vendor.address && <span className="flex items-center gap-1"><MapPin className="size-3" />{vendor.address}</span>}
      </div>
    </div>
  )
}
