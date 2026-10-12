# Proyecto_analisis_2
Este es un proyecto grupal de analisis de sistemas 2 

## Módulo de Planilla (puntos 10 a 13)

| Opción | Página | API (`/planilla/...`) |
|---|---|---|
| Empleados | `empleado.html` | `GET/POST /empleados`, `PUT/DELETE /empleados/:id`, `GET /empleados/combos` |
| Cuentas Bancarias Empleados | `cuenta_bancaria_empleado.html` | `GET/POST /cuentas-bancarias`, `PUT/DELETE /cuentas-bancarias/:id`, `GET /cuentas-bancarias/combos` |
| Inasistencias de Empleados | `inasistencia.html` | `GET/POST /inasistencias`, `PUT/DELETE /inasistencias/:id`, `GET /inasistencias/empleados` |
| Calcular Planilla | `calculo_planilla.html` | `GET /periodos`, `POST /calcular`, `GET /resultado/:anio/:mes` |

Reglas de negocio principales:
- **Empleados:** una persona solo puede ser empleado una vez; un cambio de status debe existir en `FLUJO_STATUS_EMPLEADO`.
- **Cuentas bancarias:** un empleado solo puede tener una cuenta activa; no se repite número de cuenta dentro de un banco.
- **Inasistencias:** no pueden traslaparse para un mismo empleado; las ya procesadas no se editan ni se eliminan.
- **Cálculo de planilla:** procesa empleados con status Activo contratados hasta el fin del período. Descuento por inasistencia = días de ausencia dentro del período × (sueldo base ÷ 30), solo inasistencias pendientes. Salario neto = sueldo base + bonificación + otros ingresos − IGSS − ISR − inasistencias. Un período solo se calcula una vez (transacción única sobre `PLANILLA_CABECERA`, `PLANILLA_DETALLE` e `INASISTENCIA`).

Después de ejecutar los scripts SQL, correr `actualizar_paginas_opcion.sql` para que la columna `Pagina` de `OPCION` coincida con los archivos de `public/`.
