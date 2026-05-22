# CI/CD setup — GitHub Actions

Este proyecto tiene 2 workflows:

| Workflow | Cuándo corre | Qué hace |
|---|---|---|
| `.github/workflows/ci.yml` | push a `main` + cada PR | Install + Prisma generate + Typecheck + Lint + Tests |
| `.github/workflows/migration-check.yml` | PRs que tocan `prisma/` | Detecta drift entre schema y migrations |

## Activar branch protection en GitHub (manual)

Lo siguiente lo tenés que hacer una sola vez en GitHub Settings.

### 1. Forzar que los checks pasen antes de mergear a main

1. Andá a `https://github.com/ricardosagastumegon/propiedadesnoctua/settings/branches`
2. Click **"Add branch protection rule"** (o "Add classic branch protection rule")
3. **Branch name pattern**: `main`
4. Marcá estas opciones:
   - ✅ **Require a pull request before merging**
     - "Require approvals": 1 (o 0 si trabajás solo)
   - ✅ **Require status checks to pass before merging**
     - ✅ **Require branches to be up to date before merging**
     - Buscá y agregá estos status checks:
       - `CI / Lint + Typecheck + Tests`
       - `Migration drift check / Prisma schema vs migrations` *(si aplicable)*
   - ✅ **Require conversation resolution before merging**
   - ✅ **Do not allow bypassing the above settings**
5. **Create** / **Save changes**

### 2. (Opcional) Bloquear force-push a main

En la misma pantalla:
- ✅ **Restrict force pushes**
- ✅ **Restrict deletions**

### 3. Verificar que el primer workflow corra

Después del próximo push a `main`, andá a `https://github.com/ricardosagastumegon/propiedadesnoctua/actions` — deberías ver el workflow ejecutándose.

Si falla la primera vez por algo de la config del runner (cache, install), abrí el log y mandámelo.

## Trabajo local antes de pushear

Para evitar que el CI rebote tu PR, corré localmente:

```bash
pnpm typecheck     # ojo: 0 errores
pnpm lint          # ojo: 0 errores
pnpm test          # ojo: 100% pasan
```

Si algo falla local, no commitees todavía. El CI corre los mismos checks; mejor descubrirlo antes.

## Costos

GitHub Actions tiene **2000 minutos/mes gratis** en cuentas personales. Cada CI run estimado ~3 min. Eso te da ~666 builds/mes. Más que suficiente.

Si te quedás corto, GitHub cobra $0.008/min en runners Linux pequeños.

## Troubleshooting

| Error | Causa | Fix |
|---|---|---|
| `Lockfile not found` | pnpm-lock.yaml no estaba commiteado | `git add pnpm-lock.yaml` |
| `Prisma generate failed` | `DATABASE_URL` no necesaria para generate, pero a veces se exige | Setear `DATABASE_URL` como secret dummy en GitHub Settings → Secrets |
| `Tests fail` con prisma error | Tests usan mocks (vitest-mock-extended) — no debería pasar | Revisar `src/test/setup.ts` |
| `Typecheck slow` (>2 min) | Cache de pnpm no funcionando | Verificar paso `cache: pnpm` en setup-node |
