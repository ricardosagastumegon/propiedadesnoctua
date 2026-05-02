"use client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"

export function BackButton({ href, label = "Volver" }: { href?: string; label?: string }) {
  const router = useRouter()
  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5 text-muted-foreground -ml-2"
      onClick={() => (href ? router.push(href) : router.back())}
    >
      <ChevronLeft className="size-4" />
      {label}
    </Button>
  )
}
