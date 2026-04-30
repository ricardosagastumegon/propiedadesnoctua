"use client"
import * as React from "react"
import { Upload, X, FileImage } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileUploadProps {
  accept?: string
  multiple?: boolean
  maxSizeMB?: number
  onFilesChange?: (files: File[]) => void
  className?: string
  label?: string
}

export function FileUpload({
  accept = "image/*",
  multiple = false,
  maxSizeMB = 5,
  onFilesChange,
  className,
  label = "Arrastra archivos o haz clic para seleccionar",
}: FileUploadProps) {
  const [files, setFiles] = React.useState<File[]>([])
  const [dragging, setDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return
    const valid = Array.from(incoming).filter((f) => f.size <= maxSizeMB * 1024 * 1024)
    const next = multiple ? [...files, ...valid] : valid.slice(0, 1)
    setFiles(next)
    onFilesChange?.(next)
  }

  const remove = (idx: number) => {
    const next = files.filter((_, i) => i !== idx)
    setFiles(next)
    onFilesChange?.(next)
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
      >
        <Upload className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center">{label}</p>
        <p className="text-xs text-muted-foreground">Max {maxSizeMB}MB por archivo</p>
        <input ref={inputRef} type="file" accept={accept} multiple={multiple} className="hidden" onChange={(e) => addFiles(e.target.files)} />
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {files.map((file, i) => (
            <div key={i} className="relative group rounded-lg border bg-muted overflow-hidden">
              {file.type.startsWith("image/") ? (
                <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-24 object-cover" />
              ) : (
                <div className="flex items-center justify-center h-24">
                  <FileImage className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button type="button" onClick={(e) => { e.stopPropagation(); remove(i) }} className="rounded-full bg-white/20 p-1 hover:bg-white/40">
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
              <div className="p-1.5">
                <p className="text-xs text-muted-foreground truncate">{file.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
