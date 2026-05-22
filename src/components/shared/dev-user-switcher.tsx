"use client"
import { useState, useTransition } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ROLES } from "@/app/(app)/configuracion/users/_users-manager"

interface UserOption {
  email: string
  name: string
  role: string
}

interface Props {
  users: UserOption[]
}

/**
 * DEV ONLY: dropdown que permite cambiar de usuario sin password.
 * Solo se renderiza si NODE_ENV !== "production" (gate hecho en el server component padre).
 */
export function DevUserSwitcher({ users }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  async function switchTo(email: string) {
    setOpen(false)
    startTransition(async () => {
      // En dev, los usuarios demo tienen password "demo1234"
      const res = await signIn("credentials", {
        email,
        password: "demo1234",
        redirect: false,
      })
      if (res?.ok) router.refresh()
    })
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs bg-amber-100 text-amber-900 border border-amber-300 rounded-md px-2.5 py-1 hover:bg-amber-200 transition-colors"
        disabled={pending}
      >
        🛠 {pending ? "Cambiando…" : "Cambiar usuario (dev)"}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-72 bg-background border rounded-md shadow-lg p-1 max-h-96 overflow-y-auto">
          <p className="text-[10px] text-muted-foreground px-2 py-1 border-b">
            Cambio rápido de sesión (sin password, solo dev)
          </p>
          {users.map(u => (
            <button
              key={u.email}
              onClick={() => switchTo(u.email)}
              className="w-full text-left px-2 py-1.5 hover:bg-muted rounded text-xs"
            >
              <div className="font-medium">{u.name}</div>
              <div className="text-muted-foreground text-[10px]">{u.email} · {ROLES[u.role] ?? u.role}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
