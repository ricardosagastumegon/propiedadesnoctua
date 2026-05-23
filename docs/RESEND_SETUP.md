# Setup de Resend (envío de emails)

Resend manda los emails transaccionales: welcome, password reset, invitaciones de usuario.

## 1. Crear cuenta

1. Andá a https://resend.com/signup y registrate (gratis, sin tarjeta).
2. Verificá tu email.

## 2. Obtener API key

1. En el dashboard: **API Keys** → **Create API Key**.
2. Nombre: `noctua-production` (o `noctua-dev` para local).
3. Permission: **Sending access**.
4. Copiá la clave (empieza con `re_…`). **Solo se ve una vez.**

## 3. Setear env vars

### Local (`.env`)

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=Noctua <onboarding@resend.dev>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Vercel (producción)

Project Settings → Environment Variables → agregar:
- `RESEND_API_KEY` = la clave (Production + Preview)
- `EMAIL_FROM` = `Noctua <onboarding@resend.dev>` (Production + Preview)
- `NEXT_PUBLIC_APP_URL` = `https://www.noctuapo.com` (Production)

## 4. Dominio de prueba — no requiere verificación

Resend permite enviar desde `onboarding@resend.dev` **sin verificar dominio propio**. Esto funciona desde el día 0 para signup/password reset.

**Limitación:** los emails salen con remitente `onboarding@resend.dev` (puede caer en spam de algunos clientes). Es suficiente para empezar a vender.

## 5. Cuando tengas dominio propio

1. En Resend: **Domains** → **Add Domain** → ej. `noctuapo.com`.
2. Resend te da registros DNS (SPF, DKIM, DMARC). Copialos en GoDaddy.
3. Esperá verificación (5–30 min).
4. Cambiá `EMAIL_FROM` en Vercel a `Noctua <hola@noctuapo.com>`.

## 6. Modo dev sin Resend

Si `RESEND_API_KEY` no está seteada, el sistema **no falla**: imprime el email en consola. Útil para desarrollo sin tener que crear cuenta.

```
[email:dev] → juan@empresa.gt
[email:dev] subject: Restablecer tu contraseña
[email:dev] body: ...HTML...
```

## 7. Verificación

Después de setear las env vars:
1. Hacé un signup en /signup con un email real → debería llegar el welcome.
2. Hacé un password reset en /recuperar-password → debería llegar el reset link.

Si no llegan: revisar Resend dashboard → **Logs** para ver el error.
