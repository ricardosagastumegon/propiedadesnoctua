# Noctua · Historial de versiones

Versiones por migración de base de datos + hitos de producto. De más nuevo a más viejo.

---

## v16 — Contorno Legal vs Real (jun 2026)
- Cada predio tiene **dos contornos**: legal (plano/RIC) y real (medido en campo).
- Mapa de finca con **capas activables** (legal punteado azul / real verde) + leyenda.
- Lista de predios muestra **área legal, real y diferencia Δ** con alerta si supera 5%.
- Picker del real: **copiar del legal** + **mover vértices** arrastrando (ajustes chicos).

## Estilo — Identidad "Medianoche sobre blanco" (jun 2026)
- Tokens de color remapeados: fondo blanco, botones/títulos azul medianoche, oro de acento.
- Sidebar oscuro con búho oro. Marca unificada a **Noctua · Tu Propiedad**.
- Reseña UX aplicada: oro accesible (AA), un botón primario por pantalla, calidez.
- Scrollbars finos. Landing + login + PDF re-marcados.

## PWA + Admin (jun 2026)
- **Instalable como app** (manifest, iconos, banner Android/iOS).
- Admin: **último ingreso** por usuario + **definir clave** (elegida por el admin).

## v15 — Galería de fotos
- Múltiples fotos por propiedad (mín. 3 para inmobiliarias); visible en link público.

## v14 — Módulos por tenant
- Activar/desactivar módulos por organización (modo inmobiliario).

## v13 — Compartir propiedad
- Link público de solo lectura (`/p/<token>`) para WhatsApp, con mapa y precio.

## v12 — Predios / catastros
- Una finca con **varios predios** (PropertyParcel); contrato puede ligarse a un predio.

## v11 — Mapa y contornos
- Módulo Mapa (resumen de todas las propiedades), dibujo de polígono, KML/GeoJSON/
  Shapefile, **plano GTM del RIC**, capa catastro RIC, unidades ha/mz/caballería.

## Base (v1–v10)
- Multi-tenant, roles y permisos, propiedades, inquilinos, contratos, pagos y facturas,
  caja chica, mantenimiento (tickets), activos, proyectos (partidas), proveedores,
  cotizaciones, empleados, **autorizaciones**, **aceptaciones** (cap 80%), reportes,
  auditoría, signup público, reset de password, dashboard.
