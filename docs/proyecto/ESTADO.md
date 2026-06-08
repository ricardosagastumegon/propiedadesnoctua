# Noctua · Estado actual del producto

_Última actualización: junio 2026_

Resumen vivo de lo que el sistema **ya hace hoy en producción** (noctuapo.com).
Sirve como referencia rápida para ventas, soporte y para decidir qué sigue.

---

## Identidad
- **Marca:** Noctua · Tu Propiedad (búho, paleta "Medianoche sobre blanco": azul `#12182A` + oro `#B68A3E`).
- **Dos productos:** Noctua **Properties** (este sistema) y Noctua **CEA** (`cea.noctuapo.com`).
- **Instalable como app** en celular (PWA) — Android prompt nativo, iOS "Agregar a inicio".

## Arquitectura
- Next.js 16 + React 19 + TypeScript + Tailwind v4.
- Prisma 6 + PostgreSQL (Supabase). NextAuth v5 (JWT).
- Deploy: Vercel. Emails: Resend. Rate-limit: Upstash (opcional).
- **Multi-tenant**: cada organización ve solo sus datos (aislamiento por `organizationId` + filtro por propiedad).

## Módulos (16)
Dashboard · Propiedades · **Mapa** · Inquilinos · Contratos · Pagos y Facturas ·
Caja Chica · Mantenimiento · Activos · Proyectos · Proveedores · Cotizaciones ·
Empleados · Autorizaciones · Aceptaciones · Reportes · Configuración.

> Los módulos se **activan/desactivan por tenant** (modo inmobiliario = menos módulos).

## Capacidades destacadas
- **Roles y permisos**: 8 roles × acciones (ver/crear/editar/eliminar) + acceso por propiedad.
- **Autorizaciones**: pagos sobre umbral requieren aprobación; co-firma; anti-conflicto de interés.
- **Aceptación de servicios**: cap del 80% antes del pago final, hash de verificación.
- **Mapa de propiedades**: satélite (Esri/MapTiler) + capa **catastro RIC** + dibujo de contorno.
  - **Finca → predios/catastros** (varios por finca).
  - **Doble capa Legal vs Real** por predio + diferencia de área con alerta (>5%).
  - Carga del contorno: dibujar, KML/GeoJSON/Shapefile, **plano GTM del RIC** (Punto 0 + tabla),
    o **copiar legal → real y mover 1-2 vértices**.
  - Área en **hectáreas / manzanas / caballerías**.
- **Compartir propiedad** por link público (`/p/<token>`) con foto, galería, mapa y precio (para WhatsApp).
- **Super-admin de plataforma** (`/admin`): ver tenants, crear, módulos por tenant,
  ver usuarios + último ingreso, definir/resetear claves, activar/desactivar.
- **Auditoría**: log de cada acción (quién, qué, cuándo).
- **Onboarding self-service**: signup público, reset de password por email.

## Calidad
- 146 tests automatizados (vitest). Typecheck + build limpios en cada cambio.
- Mobile-first responsive. Auditoría de contraste aplicada al tema.

## Pendientes operativos (del dueño)
- Configurar **Resend** (emails) y **Upstash** (rate-limit) en Vercel — opcionales.
- (Opcional) `NEXT_PUBLIC_MAPTILER_KEY` para satélite premium.
- Apuntar `cea.noctuapo.com` cuando CEA esté listo.
