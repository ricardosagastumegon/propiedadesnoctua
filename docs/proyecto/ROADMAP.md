# Noctua · Roadmap (próximas versiones)

Ideas para hacer el programa más robusto. Ordenadas por **valor / esfuerzo**.
Estado: 🟢 fácil (base ya existe) · 🟡 medio · 🔴 grande.

---

## 1. 🟢 Empleados por casa (vista en la propiedad)
**Qué:** ver en cada propiedad/finca quién trabaja ahí (jardinero, guardián, casero),
con horas y pagos. Hoy ya se puede asignar un empleado a una propiedad pero no se ve
desde la ficha de la casa.

**Por qué barato:** el modelo `EmployeeAssignment` ya tiene `propertyId`, `hoursWorked`,
`amountPaid`, fechas y notas. **Falta solo la pantalla.**

**Plan:**
- Tab "Personal" en el detalle de propiedad → lista de empleados asignados (activos/históricos).
- Botón "Asignar empleado" (elegir empleado, rol en la casa, fechas).
- Totales: cuánta gente, horas del mes, pagado del mes.

---

## 2. 🟢 Gastos por casa
**Qué:** registrar y ver gastos de cada propiedad (agua, luz, reparaciones, IUSI,
insumos de finca) y un total por casa y por mes.

**Por qué barato:** el modelo `Expense` ya tiene `propertyId`, `category`, `amount`,
`date`, `description`. **Falta la pantalla por propiedad y el reporte.**

**Plan:**
- Tab "Gastos" en el detalle de propiedad → lista + filtro por categoría/mes.
- "Nuevo gasto" rápido (categoría, monto, fecha, nota, foto del recibo opcional).
- Resumen: gasto del mes, por categoría, y **rentabilidad** (ingresos − gastos) por casa.
- En Reportes: ranking de casas por gasto / por rentabilidad.

---

## 3. 🟡 Planos reales de la casa (2D) → 🔴 vista 3D
**Qué:** subir el plano real de la casa y poder verlo; a futuro, un modelo 3D navegable.

**Por etapas (recomendado, de menor a mayor esfuerzo):**

### 3a. 🟢 Plano 2D (imagen / PDF)
- Subir imagen o PDF del plano por propiedad (como la galería de fotos).
- Verlo con zoom. Resuelve el 80% de la necesidad ("tener el plano a mano").

### 3b. 🟡 Plano 3D navegable (modelo subido)
- Subir un modelo **.glb / .gltf** (lo exporta SketchUp, Revit, Blender, escaneo con celular).
- Verlo en el navegador con **`<model-viewer>`** (componente de Google, gratis, gira/zoom,
  funciona en celular y hasta en RA "ver en tu espacio"). Sin servidor de render.
- Ideal para mostrar a clientes/inversionistas — diferenciador fuerte.

### 3c. 🔴 Recorrido / tour inmersivo
- Tour 360° (fotos esféricas) o walk-through tipo Matterport.
- Mayor costo; evaluar solo si un cliente grande lo pide.

> **Nota honesta:** "ver la casa en 3D" se logra bien y barato en 3b subiendo un modelo
> ya hecho. Generar el 3D **automáticamente** desde fotos/plano es caro y poco fiable —
> mejor que el modelo lo provea quien lo tenga (arquitecto/escaneo) y nosotros lo mostramos.

---

## Otras ideas (backlog)
- 🟡 **Documentos por propiedad** (escrituras, contratos firmados, IUSI) con vencimientos.
- 🟡 **Recordatorios/alertas** (contrato por vencer, IUSI, pago de empleado) por email/push.
- 🟡 **Estado de cuenta del inquilino** en PDF con la marca Medianoche.
- 🟢 **Exportar reportes a PDF/Excel** con el nuevo estilo.
- 🟡 **Línea de tiempo** por propiedad (todo lo que pasó: pagos, tickets, gastos, personal).

---

## Sugerencia de orden
1. **Gastos por casa** (#2) — alto valor, base lista, habilita "rentabilidad por casa".
2. **Empleados por casa** (#1) — base lista, completa la operación de fincas.
3. **Plano 2D** (#3a) — rápido, útil ya.
4. **Plano 3D** (#3b) — el "wow" para vender, cuando #1–3a estén sólidos.
