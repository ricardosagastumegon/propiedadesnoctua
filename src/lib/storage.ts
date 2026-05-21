// Supabase Storage adapter.
// NEVER import this from a "use client" component — service role key is server-only.
import "server-only"
import { createClient, SupabaseClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export const STORAGE_BUCKET = "uploads"
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
export const ALLOWED_MIMES = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
])

let _client: SupabaseClient | null = null
function getClient(): SupabaseClient {
  if (_client) return _client
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error(
      "Supabase Storage no configurado. Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env",
    )
  }
  _client = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return _client
}

export interface UploadResult {
  url: string
  path: string
}

function extFromName(name: string, fallback = "bin"): string {
  const m = name.split(".")
  if (m.length < 2) return fallback
  const ext = m.pop()!.toLowerCase()
  // sanitize ext to alphanumeric only
  return ext.replace(/[^a-z0-9]/g, "").slice(0, 10) || fallback
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export async function uploadFile(
  file: File,
  type: string,
  orgId: string,
): Promise<UploadResult> {
  if (!file) throw new Error("Sin archivo")
  if (!ALLOWED_MIMES.has(file.type)) {
    throw new Error(
      `Tipo de archivo no permitido: ${file.type || "desconocido"}. Permitidos: ${Array.from(ALLOWED_MIMES).join(", ")}`,
    )
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Archivo excede el límite de ${MAX_FILE_SIZE / (1024 * 1024)} MB`)
  }

  const safeType = type.replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "general"
  const safeOrg = orgId.replace(/[^a-z0-9_-]/gi, "").slice(0, 64)
  const ext = extFromName(file.name)
  const path = `${safeType}/${safeOrg}/${randomId()}.${ext}`

  const client = getClient()
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await client.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
      cacheControl: "3600",
    })

  if (error) {
    throw new Error(`Error al subir archivo: ${error.message}`)
  }

  const { data: publicUrl } = client.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return { url: publicUrl.publicUrl, path }
}

export async function deleteFile(path: string): Promise<void> {
  if (!path) return
  const client = getClient()
  const { error } = await client.storage.from(STORAGE_BUCKET).remove([path])
  if (error) {
    throw new Error(`Error al eliminar archivo: ${error.message}`)
  }
}

export function isStorageConfigured(): boolean {
  return !!SUPABASE_URL && !!SERVICE_KEY
}
