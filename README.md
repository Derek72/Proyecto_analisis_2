# Proyecto_analisis_2
Este es un proyecto grupal de analisis de sistemas 2 

## Módulo de Planilla (puntos 10 a 16)

| Opción | Página | API (`/planilla/...`) |
|---|---|---|
| Empleados | `empleado.html` | `GET/POST /empleados`, `PUT/DELETE /empleados/:id`, `GET /empleados/combos` |
| Cuentas Bancarias Empleados | `cuenta_bancaria_empleado.html` | `GET/POST /cuentas-bancarias`, `PUT/DELETE /cuentas-bancarias/:id`, `GET /cuentas-bancarias/combos` |
| Inasistencias de Empleados | `inasistencia.html` | `GET/POST /inasistencias`, `PUT/DELETE /inasistencias/:id`, `GET /inasistencias/empleados` |
| Calcular Planilla | `calculo_planilla.html` | `GET /periodos`, `POST /calcular`, `GET /resultado/:anio/:mes` |
| Reporte de Planilla | `reporte_planilla.html` | `GET /reporte/periodos`, `GET /reporte/consolidado/:anio/:mes` |
| Boletas de Pago | `boleta_pago.html` | `GET /boletas/periodo/:anio/:mes/empleados`, `GET /boletas/:anio/:mes/:idEmpleado` |
| Liquidación de Empleado | `liquidacion.html` | `GET/POST /liquidaciones`, `PUT/DELETE /liquidaciones/:id`, `POST /liquidaciones/simular` |

Reglas de negocio principales:
- **Empleados:** una persona solo puede ser empleado una vez; un cambio de status debe existir en `FLUJO_STATUS_EMPLEADO`.
- **Cuentas bancarias:** un empleado solo puede tener una cuenta activa; no se repite número de cuenta dentro de un banco.
- **Inasistencias:** no pueden traslaparse para un mismo empleado; las ya procesadas no se editan ni se eliminan.
- **Cálculo de planilla:** procesa empleados con status Activo contratados hasta el fin del período. Descuento por inasistencia = días de ausencia dentro del período × (sueldo base ÷ 30), solo inasistencias pendientes. Salario neto = sueldo base + bonificación + otros ingresos − IGSS − ISR − inasistencias. Un período solo se calcula una vez (transacción única sobre `PLANILLA_CABECERA`, `PLANILLA_DETALLE` e `INASISTENCIA`).
- **Reporte de planilla:** consulta valores consolidados directamente de `PLANILLA_CABECERA` y `PLANILLA_DETALLE` (o vista `V_REPORTE_PLANILLA`) sin recalcular en tiempo de ejecución. Permite filtrado por período, exportación a Excel e impresión a PDF.
- **Boletas de pago:** emite comprobantes individuales de pago por empleado y período cerrado a partir de `PLANILLA_DETALLE`, mostrando desglose de ingresos, deducciones legales (IGSS/ISR/inasistencias) y total neto.
- **Liquidación de empleado:** cálculo en tiempo real de prestaciones laborales conforme al Código de Trabajo (indemnización si es despido injustificado, aguinaldo proporcional, bono 14 proporcional y vacaciones no gozadas). Operación transaccional que crea el registro de liquidación, actualiza el status del empleado a inactivo y registra la trazabilidad en `HISTORIAL_LABORAL`.

Para la base de datos, ejecutar `database_puntos_14_15_16.sql` para crear las vistas `V_REPORTE_PLANILLA`, `V_BOLETA_PAGO`, las tablas `LIQUIDACION_EMPLEADO`, `HISTORIAL_LABORAL` y la asignación de opciones y permisos en `OPCION` y `ROLE_OPCION`.
Los componentes modulares de React se encuentran disponibles en `frontend/src/components/` y `src/components/`.
