# Sentry — observabilidad de errores

Sentry captura errores no manejados (server actions, client crashes, API routes)
y te avisa en tiempo real. Sin Sentry, los errores en prod son ciegos hasta que
un usuario reclame.

**Sentry es opcional**. Si no seteás `NEXT_PUBLIC_SENTRY_DSN`, la app funciona
exactamente igual y simplemente no envía nada (errores quedan en logs de Vercel
y en console del navegador).

---

## 1. Crear cuenta y proyecto

1. Andá a https://sentry.io → **Sign up** (free, no necesita tarjeta).
2. Plan: **Developer** (gratis): 5,000 errores/mes + 50 replays + 10K performance traces.
3. Después del signup, **Create new project**:
   - **Platform**: **Next.js**
   - **Alert frequency**: "On every new issue" (lo cambiás después si te satura)
   - **Project name**: `propiedadesnoctua`
   - **Team**: el default (tu org)
4. Click **Create Project**.

## 2. Copiar la DSN

Después de crear el proyecto Sentry te muestra la **DSN** (URL larga tipo
`https://abc123@o456789.ingest.sentry.io/1234567`).

Si te la perdés: **Project Settings** → **Client Keys (DSN)**.

## 3. Setear en `.env` local

```env
NEXT_PUBLIC_SENTRY_DSN="https://abc123@o456789.ingest.sentry.io/1234567"
```

## 4. Setear en Vercel

**Vercel** → tu proyecto → **Settings** → **Environment Variables**:
- Name: `NEXT_PUBLIC_SENTRY_DSN`
- Value: la DSN
- Aplicar a: **Production + Preview + Development**

Después: **Deployments** → último → **Redeploy** (sin cache).

## 5. Verificar que captura errores

Una vez deployado con la DSN seteada, podés tirar un error de prueba:

1. En el `error.tsx` global o en alguna action, agregás temporalmente:
   ```typescript
   throw new Error("Prueba Sentry desde server action")
   ```
2. Disparás esa acción desde la UI.
3. Andá a Sentry → tu proyecto → **Issues**. Debería aparecer ahí en segundos.
4. Remové el throw después.

## 6. Cómo se usa en el código

Ya está integrado. No necesitás llamar a Sentry manualmente — todo va por:

**A. Boundaries automáticos** (`src/app/error.tsx`, `src/app/(app)/error.tsx`)
   - Capturan errores no manejados de páginas y client components.

**B. Helper `logError`** (`src/lib/observability.ts`)
   - Llamado desde catch blocks de server actions críticas (pagos, aceptaciones, upload).
   - Si Sentry está configurado, reporta. Siempre console.error.

**C. Uso directo** (cuando necesitás contexto extra):
   ```typescript
   import { logError } from "@/lib/observability"

   try { ... } catch (e) {
     logError(e, {
       area: "payment",
       orgId,
       userId,
       extra: { paymentId, amount }
     })
   }
   ```

## 7. Filtrar ruido

Cuando empiece a llegar tráfico, vas a recibir cosas como:
- Browser extension errors (ResizeObserver, Cross-origin)
- Errors del usuario (cerró tab mid-request)

En Sentry → **Project Settings** → **Inbound Filters**:
- ✅ Filter out errors known to be caused by browser extensions
- ✅ Filter out events that contain known web crawlers
- ✅ Filter out events from localhost (en producción)

## 8. Costos

Free tier:
- **5,000 errors/month**
- **50 replays**
- **10K performance events**

Si te quedás corto: Team plan $26/mes (50K errors). Para una app con 50-100 usuarios activos, el free alcanza sobrado.

## 9. Troubleshooting

| Problema | Causa | Fix |
|---|---|---|
| No llega nada a Sentry | DSN no seteada en Vercel | Verificar `NEXT_PUBLIC_SENTRY_DSN` en Settings → Env Vars |
| Sentry rompe el build | Conflict con turbopack | El `instrumentation.ts` se genera automáticamente; si no, agregalo manualmente |
| Demasiado ruido | Filtros default desactivados | Activá los inbound filters (paso 7) |
| Stack traces oscuros (minified) | source maps no se suben | Sentry CLI auto-upload con el wizard de `@sentry/wizard` |

Si querés activar source maps automáticos en cada deploy, corré una sola vez:
```bash
npx @sentry/wizard@latest -i nextjs
```
(Esto modifica `next.config.ts` y agrega scripts. Hoy lo dejamos sin source maps automáticos porque no es crítico para arrancar.)
