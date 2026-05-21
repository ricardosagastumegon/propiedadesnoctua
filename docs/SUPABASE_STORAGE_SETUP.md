# Configuración de Supabase Storage para uploads

Esta app usa Supabase Storage para fotos de evidencia de aceptaciones, planos
de propiedades, portadas de propiedades, actas en PDF, etc. El filesystem de
Vercel es efímero (se borra entre invocaciones), por eso **NO se puede usar
`public/uploads/`** en producción.

Tenés que crear UN bucket en Supabase Storage llamado `uploads`.

---

## 1. Crear el bucket

1. Andá a https://supabase.com/dashboard → tu proyecto (NOCTUAPROPIEDADES).
2. Menú lateral → **Storage**.
3. Click **New bucket**.
4. Configurá así:
   - **Name**: `uploads`
   - **Public bucket**: ✅ **ON** (las URLs públicas se sirven sin auth — necesario
     para mostrar fotos sin pedir token al cliente)
   - **File size limit**: `10 MB` (coincide con el límite del lado app)
   - **Allowed MIME types**: dejar vacío (la validación se hace en `src/lib/storage.ts`)
5. **Save**.

---

## 2. Políticas RLS (Row Level Security)

Aunque el bucket sea público para LECTURA, las **escrituras** deben ir solo
desde nuestro server con la `service_role` key (lo cual bypassea RLS). Pero
por defensa en profundidad, configurá estas políticas:

1. En **Storage → uploads** → tab **Policies**.
2. Borrá cualquier política default que venga.
3. Click **New Policy** → **For full customization**.

### Política A — Lectura pública

```
Name: Public read
Operation: SELECT
Target roles: anon, authenticated
USING expression: bucket_id = 'uploads'
```

### Política B — Escritura sólo service role

No es necesario crear una política para INSERT/UPDATE/DELETE porque la
`service_role` key bypassea RLS automáticamente. Si querés ser explícito y
bloquear escrituras desde anon/authenticated:

```
Name: No anon writes
Operation: INSERT
Target roles: anon, authenticated
WITH CHECK expression: false
```

(Repetir para UPDATE y DELETE si querés cero superficie.)

---

## 3. Copiar las credenciales al `.env`

1. **Project Settings** → **API**.
2. Copiá:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role** (la secret, **no la anon**) → `SUPABASE_SERVICE_ROLE_KEY`

   ⚠️ La `service_role` key da acceso TOTAL al proyecto (bypassea RLS,
   permite borrar tablas, etc.). **Jamás** la expongas al cliente. Solo se
   usa server-side en `src/lib/storage.ts`. Está en `.gitignore` vía `.env*`.

3. Pegá en el `.env` local:
   ```
   NEXT_PUBLIC_SUPABASE_URL="https://hqgxffrbmhlfdlrayqeh.supabase.co"
   SUPABASE_SERVICE_ROLE_KEY="<paste aquí>"
   ```

4. En **Vercel** (Settings → Environment Variables) agregá las MISMAS dos
   variables con los mismos valores. Aplicalas a **Production, Preview y
   Development**.

---

## 4. Verificar que funciona

### Local

```
pnpm dev
```

1. Login → cualquier ticket / aceptación pendiente → subir una foto.
2. Andá a Supabase Dashboard → Storage → uploads → debería aparecer la foto
   con path `<type>/<orgId>/<uuid>.<ext>`.
3. La URL pública debe verse en la app, formato:
   `https://hqgxffrbmhlfdlrayqeh.supabase.co/storage/v1/object/public/uploads/...`

### Producción (Vercel)

Después de configurar las env vars en Vercel y redeployar:

1. Login en `noctuapo.com`.
2. Repetir el upload.
3. Verificar misma URL en Supabase Dashboard.

---

## 5. Troubleshooting

| Error | Causa | Fix |
|---|---|---|
| `Storage no configurado` (500) | Faltan env vars | Setealas en `.env` y Vercel |
| `Tipo de archivo no permitido` (400) | MIME fuera de lista permitida | Solo se aceptan JPEG, PNG, WebP, GIF, PDF |
| `Archivo excede el límite de 10 MB` | Tamaño > 10MB | Comprimir o aumentar `MAX_FILE_SIZE` en `storage.ts` Y el bucket |
| `Error al subir archivo: new row violates row-level security` | RLS configurado mal o key equivocada | Verificá que estés usando `service_role` (NO la `anon`) |
| Foto se sube pero no se ve | Bucket no es público | Marcá **Public bucket** en config del bucket |

---

## 6. Estructura de archivos en el bucket

```
uploads/
├── properties/
│   └── <orgId>/
│       └── <uuid>.jpg            # portadas de propiedades
├── acceptance/
│   └── <orgId>/
│       └── <uuid>.jpg            # fotos de evidencia de aceptación
├── tickets/
│   └── <orgId>/
│       └── <uuid>.jpg            # fotos antes/después de tickets
├── plans/
│   └── <orgId>/
│       └── <uuid>.pdf            # planos arquitectónicos
└── general/
    └── <orgId>/
        └── <uuid>.<ext>          # fallback
```

El `type` se valida y sanitiza en `uploadFile()` para que no se pueda escapar
del path con `../`. El `orgId` viene de la sesión autenticada, no del cliente.

---

## 7. Costos

- Free tier: **1 GB de storage + 2 GB de bandwidth/mes**.
- Después: $0.021/GB storage + $0.09/GB bandwidth.

Estimado realista (inmobiliaria con 100 propiedades × 50 fotos × 500KB):
- Storage: ~2.5 GB → $0.05/mes
- Bandwidth: depende del tráfico, típico ~5-10 GB/mes → $0.45-$0.90/mes

Total típico: **menos de $1/mes**.
