"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { markAllRead } from "./actions"

export function MarkAllReadButton() {
  const [loading, setLoading] = useState(false)

  async function handle() {
    setLoading(true)
    await markAllRead()
    setLoading(false)
  }

  return (
    <Button variant="outline" size="sm" onClick={handle} disabled={loading}>
      {loading ? "..." : "Marcar todas como leidas"}
    </Button>
  )
}
