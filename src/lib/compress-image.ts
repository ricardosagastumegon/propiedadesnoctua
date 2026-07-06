// Reduce el peso de una imagen EN EL CLIENTE antes de subirla.
// Motivo: las funciones serverless de Vercel rechazan cuerpos > ~4.5 MB, y las
// fotos de celular suelen pesar más. Además acelera la subida. Devuelve un File JPEG.
// Si algo falla (formato raro tipo HEIC, sin canvas), devuelve el archivo original.
export async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<File> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) return file
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions)
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, "image/jpeg", quality))
    if (!blob) return file
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg"
    return new File([blob], name, { type: "image/jpeg" })
  } catch {
    return file
  }
}
