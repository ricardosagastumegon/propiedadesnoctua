// Envío de emails transaccionales. Resend para producción; en dev sin API key
// imprime el email en consola para no bloquear el flujo.
import { Resend } from "resend"

const API_KEY = process.env.RESEND_API_KEY
const FROM = process.env.EMAIL_FROM || "Noctua <onboarding@resend.dev>"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.noctuapo.com"

const client = API_KEY ? new Resend(API_KEY) : null

interface SendArgs {
  to: string
  subject: string
  html: string
}

async function send({ to, subject, html }: SendArgs): Promise<{ ok: boolean; error?: string }> {
  if (!client) {
    console.log("[email:dev] →", to)
    console.log("[email:dev] subject:", subject)
    console.log("[email:dev] body:\n", html)
    return { ok: true }
  }
  try {
    await client.emails.send({ from: FROM, to, subject, html })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// Branding compartido. Charcoal #2D2D2D, jade #3F8E5C, crema #FAF8F4.
const baseStyle = `
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #FAF8F4; color: #2D2D2D; margin: 0; padding: 0; }
  .wrap { max-width: 560px; margin: 32px auto; background: #FFFFFF; border: 1px solid #E5E5E5; border-radius: 12px; overflow: hidden; }
  .header { padding: 28px 32px 12px; border-bottom: 1px solid #F0EEE8; }
  .brand { font-size: 18px; font-weight: 600; letter-spacing: -0.01em; color: #2D2D2D; }
  .body { padding: 24px 32px 32px; font-size: 15px; line-height: 1.55; }
  .body p { margin: 0 0 12px; }
  .btn { display: inline-block; background: #2D2D2D; color: #FFFFFF !important; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 500; margin: 8px 0; }
  .muted { color: #6B6B6B; font-size: 13px; }
  .footer { padding: 16px 32px; background: #FAF8F4; border-top: 1px solid #F0EEE8; font-size: 12px; color: #6B6B6B; }
  .link { color: #3F8E5C; word-break: break-all; }
`

function template(title: string, body: string): string {
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>${title}</title><style>${baseStyle}</style></head>
<body>
  <div class="wrap">
    <div class="header"><div class="brand">Noctua Propiedades</div></div>
    <div class="body">${body}</div>
    <div class="footer">Si no esperabas este correo podés ignorarlo. — Noctua Propiedades</div>
  </div>
</body>
</html>`
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const html = template("Restablecer contraseña", `
    <p>Recibimos una solicitud para restablecer tu contraseña.</p>
    <p>Hacé click en el botón para crear una nueva. El enlace expira en 1 hora.</p>
    <p><a class="btn" href="${resetLink}">Restablecer contraseña</a></p>
    <p class="muted">Si el botón no funciona, copiá y pegá este enlace en tu navegador:</p>
    <p class="muted"><a class="link" href="${resetLink}">${resetLink}</a></p>
    <p class="muted">Si no solicitaste este cambio, ignorá este correo — tu contraseña actual seguirá siendo válida.</p>
  `)
  return send({ to, subject: "Restablecer tu contraseña — Noctua", html })
}

export async function sendWelcomeEmail(to: string, name: string, orgName: string) {
  const dashboardUrl = `${APP_URL}/dashboard`
  const html = template("Bienvenido a Noctua", `
    <p>Hola ${name},</p>
    <p>Tu organización <strong>${orgName}</strong> quedó creada en Noctua Propiedades.</p>
    <p>Desde tu panel podés gestionar propiedades, inquilinos, contratos, mantenimiento, proyectos y más.</p>
    <p><a class="btn" href="${dashboardUrl}">Ir al panel</a></p>
    <p class="muted">Cualquier duda, respondé este correo y te ayudamos.</p>
  `)
  return send({ to, subject: `Bienvenido a Noctua — ${orgName}`, html })
}

export async function sendInviteEmail(to: string, tempPassword: string, orgName: string) {
  const loginUrl = `${APP_URL}/login`
  const html = template("Te invitaron a Noctua", `
    <p>Fuiste invitado a unirte a <strong>${orgName}</strong> en Noctua Propiedades.</p>
    <p>Tu contraseña temporal es:</p>
    <p style="font-family: monospace; font-size: 16px; background: #FAF8F4; padding: 10px 14px; border-radius: 6px; border: 1px solid #E5E5E5; display: inline-block;">${tempPassword}</p>
    <p>Al ingresar te pediremos cambiarla.</p>
    <p><a class="btn" href="${loginUrl}">Iniciar sesión</a></p>
    <p class="muted">Por seguridad, no compartas esta contraseña.</p>
  `)
  return send({ to, subject: `Invitación a ${orgName} — Noctua`, html })
}

export async function sendAcquisitionEmail(to: string, candidateTitle: string, agentName: string | null, link: string) {
  const html = template("Nueva propiedad recibida", `
    <p>Un agente${agentName ? ` (<strong>${agentName}</strong>)` : ""} te envió una propiedad para analizar:</p>
    <p style="font-size: 16px;"><strong>${candidateTitle}</strong></p>
    <p><a class="btn" href="${link}">Ver en Adquisiciones</a></p>
    <p class="muted">Podés analizarla y moverla por las etapas desde tu panel.</p>
  `)
  return send({ to, subject: `Nueva propiedad recibida — ${candidateTitle}`, html })
}

export function isEmailConfigured(): boolean {
  return !!API_KEY
}
