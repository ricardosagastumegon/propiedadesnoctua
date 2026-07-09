"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Link2, Copy, RefreshCw, Check, Plus, Trash2, Target, Users, KeyRound, X } from "lucide-react"
import { createAcquisitionLink, updateAcquisitionLink, regenerateLinkToken, deleteAcquisitionLink, getMyIntermediaryCode, setLinkIntermediaryByCode, removeLinkIntermediary } from "./actions"

export interface LinkRow {
  id: string
  name: string
  token: string
  brief: string | null
  isActive: boolean
  intermediaryName: string | null
}

export function LinksManager({ links, canEdit, myCode }: { links: LinkRow[]; canEdit: boolean; myCode: string | null }) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  async function create() {
    const name = prompt("Nombre del link (ej. 'Gasolineras', 'Edificios zona 10'):")
    if (name == null) return
    setCreating(true)
    const res = await createAcquisitionLink(name || "Link")
    setCreating(false)
    if ("error" in res) { alert(res.error); return }
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {canEdit && <MyCodeCard initialCode={myCode} />}

      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm flex items-center gap-2"><Link2 className="size-4 text-[#8A6A2E]" /> Links para agentes</h3>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={create} disabled={creating}>
            <Plus className="size-3.5 mr-1" /> Nuevo link
          </Button>
        )}
      </div>

      {links.length === 0 ? (
        <Card className="p-5 text-sm text-muted-foreground">
          {canEdit ? 'No tenés links todavía. Creá uno con "Nuevo link" y compartilo con los agentes.' : "No hay links configurados."}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {links.map(l => <LinkItem key={l.id} link={l} canEdit={canEdit} onChanged={() => router.refresh()} />)}
        </div>
      )}
    </div>
  )
}

function MyCodeCard({ initialCode }: { initialCode: string | null }) {
  const [code, setCode] = useState(initialCode)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generate() {
    setBusy(true)
    const res = await getMyIntermediaryCode()
    setBusy(false)
    if ("error" in res) { alert(res.error); return }
    setCode(res.code)
  }
  function copy() { if (code) { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500) } }

  return (
    <Card className="p-4 bg-muted/20">
      <div className="flex items-center gap-2 mb-1">
        <KeyRound className="size-4 text-[#8A6A2E]" />
        <h3 className="font-medium text-sm">Tu código de intermediario</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-2">
        ¿Sos intermediario de otro cliente? Pasale este código. Con él, ese cliente te habilita a ver (solo lectura) lo que entra por su link.
      </p>
      {code ? (
        <div className="flex items-center gap-2">
          <code className="text-base font-mono font-bold tracking-[0.2em] bg-background border rounded-lg px-3 py-1.5">{code}</code>
          <Button size="sm" variant="outline" onClick={copy}>{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}</Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={generate} disabled={busy}><KeyRound className="size-3.5 mr-1" />{busy ? "…" : "Generar mi código"}</Button>
      )}
    </Card>
  )
}

function LinkItem({ link, canEdit, onChanged }: { link: LinkRow; canEdit: boolean; onChanged: () => void }) {
  const [name, setName] = useState(link.name)
  const [brief, setBrief] = useState(link.brief ?? "")
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [codeInput, setCodeInput] = useState("")

  async function assignInter() {
    setBusy(true)
    const res = await setLinkIntermediaryByCode(link.id, codeInput)
    setBusy(false)
    if ("error" in res) { alert(res.error); return }
    setCodeInput(""); onChanged()
  }
  async function removeInter() {
    if (!confirm("¿Quitar el intermediario de este link?")) return
    setBusy(true)
    const res = await removeLinkIntermediary(link.id)
    setBusy(false)
    if ("error" in res) { alert(res.error); return }
    onChanged()
  }
  const url = typeof window !== "undefined" ? `${window.location.origin}/enviar/${link.token}` : ""
  const dirty = name.trim() !== link.name || brief.trim() !== (link.brief ?? "").trim()

  async function save() {
    setBusy(true)
    const res = await updateAcquisitionLink(link.id, { name, brief })
    setBusy(false)
    if ("error" in res) { alert(res.error); return }
    onChanged()
  }
  async function regen() {
    if (!confirm("¿Generar un token nuevo? El link anterior dejará de funcionar.")) return
    setBusy(true)
    const res = await regenerateLinkToken(link.id)
    setBusy(false)
    if ("error" in res) { alert(res.error); return }
    onChanged()
  }
  async function remove() {
    if (!confirm(`¿Eliminar el link "${link.name}"? Las propiedades recibidas quedan, sin link.`)) return
    setBusy(true)
    const res = await deleteAcquisitionLink(link.id)
    setBusy(false)
    if ("error" in res) { alert(res.error); return }
    onChanged()
  }
  function copy() {
    navigator.clipboard.writeText(url)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Card className="p-4 space-y-3">
      {canEdit
        ? <Input value={name} onChange={e => setName(e.target.value)} className="font-medium" placeholder="Nombre del link" />
        : <div className="font-medium text-sm">{link.name}</div>}

      <div className="flex items-center gap-2">
        <input readOnly value={url} onFocus={e => e.currentTarget.select()}
          className="flex-1 text-xs rounded-lg border px-2.5 py-2 bg-muted/30 font-mono truncate" />
        <Button size="sm" onClick={copy} className="shrink-0">
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </Button>
      </div>

      <div>
        <div className="text-xs font-medium flex items-center gap-1.5 mb-1"><Target className="size-3.5 text-[#8A6A2E]" /> Requerimiento (lo ven los agentes)</div>
        {canEdit
          ? <Textarea value={brief} onChange={e => setBrief(e.target.value)} rows={2} placeholder="Ej: Busco gasolineras sobre carretera, hasta $500K…" />
          : <p className="text-sm whitespace-pre-wrap">{brief || <span className="text-muted-foreground">—</span>}</p>}
      </div>

      <div className="border-t pt-2.5">
        <div className="text-xs font-medium flex items-center gap-1.5 mb-1.5"><Users className="size-3.5 text-[#8A6A2E]" /> Intermediario (ve solo lectura)</div>
        {link.intermediaryName ? (
          <div className="flex items-center justify-between gap-2 text-sm">
            <span><strong>{link.intermediaryName}</strong></span>
            {canEdit && <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={removeInter} disabled={busy}><X className="size-3.5 mr-1" />Quitar</Button>}
          </div>
        ) : canEdit ? (
          <div className="flex items-center gap-2">
            <Input value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase())} placeholder="Pegá el código del intermediario" className="h-8 text-sm font-mono" />
            <Button size="sm" onClick={assignInter} disabled={busy || !codeInput.trim()} className="shrink-0">Asignar</Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Sin intermediario.</span>
        )}
      </div>

      {canEdit && (
        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-1.5">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={regen} disabled={busy}><RefreshCw className="size-3 mr-1" />Nuevo token</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={remove} disabled={busy}><Trash2 className="size-3" /></Button>
          </div>
          <Button size="sm" onClick={save} disabled={busy || !dirty}>{busy ? "…" : "Guardar"}</Button>
        </div>
      )}
    </Card>
  )
}
