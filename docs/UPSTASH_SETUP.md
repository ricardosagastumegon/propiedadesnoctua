# Setup de Upstash Redis (rate limiting)

Upstash provee la base Redis distribuida para limitar intentos de login/signup/password-reset.

Sin Upstash el sistema **sigue funcionando** con un limiter en memoria por instancia — útil en dev, no robusto en serverless multi-instancia. **Para producción real, configurar Upstash.**

## 1. Crear cuenta + base

1. Andá a https://upstash.com/ → **Sign Up** (Google/GitHub).
2. **Create Database**:
   - Name: `noctua-ratelimit`
   - Type: **Regional** (más barato)
   - Region: la más cercana a Vercel (ej. `us-east-1` si el deploy es iad1)
   - TLS: Enabled
3. Click **Create**.

## 2. Obtener credenciales REST

En la base creada, sección **REST API**:
- `UPSTASH_REDIS_REST_URL` (ej. `https://xxx-yyy.upstash.io`)
- `UPSTASH_REDIS_REST_TOKEN` (string largo)

## 3. Setear env vars

### Local (`.env`)

```
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXX...
```

### Vercel

Project Settings → Environment Variables:
- `UPSTASH_REDIS_REST_URL` (Production + Preview)
- `UPSTASH_REDIS_REST_TOKEN` (Production + Preview)

## 4. Plan gratuito

Upstash Free incluye:
- 10,000 comandos/día
- 256 MB de storage
- TLS

Para un SaaS recién lanzado alcanza de sobra. Cada login/signup gasta 1 comando.

## 5. Verificación

1. Después de setear vars, hacé login 6 veces seguidas con password mal en `/login`.
2. Al sexto intento, debería rechazar con mensaje de "demasiados intentos".
3. En Upstash dashboard → **Data Browser** verás claves como `rl:login:127.0.0.1:user@example.com`.

## 6. Tuning

Los límites están en `src/lib/rate-limit.ts`:
- Login: 5 intentos / 15 min por IP+email
- Signup: 3 por hora por IP
- Password reset: 3 por hora por IP

Ajustar ahí si querés ser más/menos estricto.
