const express = require('express');
const router = express.Router();
const c = require('../Controller/planillaController.js');
const { verificarPermisos } = require('../Middleware/autorizacion.js');

router.get('/empleados/combos', verificarPermisos('Empleados', 'Consultar'), c.obtenerCombosEmpleado);
router.get('/empleados', verificarPermisos('Empleados', 'Consultar'), c.obtenerEmpleados);
router.post('/empleados', verificarPermisos('Empleados', 'Alta'), c.crearEmpleado);
router.put('/empleados/:id', verificarPermisos('Empleados', 'Cambio'), c.actualizarEmpleado);
router.delete('/empleados/:id', verificarPermisos('Empleados', 'Baja'), c.eliminarEmpleado);

router.get('/cuentas-bancarias/combos', verificarPermisos('Cuentas Bancarias Empleados', 'Consultar'), c.obtenerCombosCuenta);
router.get('/cuentas-bancarias', verificarPermisos('Cuentas Bancarias Empleados', 'Consultar'), c.obtenerCuentas);
router.post('/cuentas-bancarias', verificarPermisos('Cuentas Bancarias Empleados', 'Alta'), c.crearCuenta);
router.put('/cuentas-bancarias/:id', verificarPermisos('Cuentas Bancarias Empleados', 'Cambio'), c.actualizarCuenta);
router.delete('/cuentas-bancarias/:id', verificarPermisos('Cuentas Bancarias Empleados', 'Baja'), c.eliminarCuenta);

router.get('/inasistencias/empleados', verificarPermisos('Inasistencias de Empleados', 'Consultar'), c.obtenerEmpleadosComboInasistencia);
router.get('/inasistencias', verificarPermisos('Inasistencias de Empleados', 'Consultar'), c.obtenerInasistencias);
router.post('/inasistencias', verificarPermisos('Inasistencias de Empleados', 'Alta'), c.crearInasistencia);
router.put('/inasistencias/:id', verificarPermisos('Inasistencias de Empleados', 'Cambio'), c.actualizarInasistencia);
router.delete('/inasistencias/:id', verificarPermisos('Inasistencias de Empleados', 'Baja'), c.eliminarInasistencia);

router.get('/periodos', verificarPermisos('Calcular Planilla', 'Consultar'), c.obtenerPeriodos);
router.get('/resultado/:anio/:mes', verificarPermisos('Calcular Planilla', 'Consultar'), c.obtenerResultadoPlanilla);
router.post('/calcular', verificarPermisos('Calcular Planilla', 'Alta'), c.calcularPlanilla);

const reporteCtrl = require('../Controller/reportePlanillaController.js');
const boletaCtrl = require('../Controller/boletaPagoController.js');
const liquidacionCtrl = require('../Controller/liquidacionController.js');

router.get('/reporte/periodos', verificarPermisos('Reporte de Planilla', 'Consultar'), reporteCtrl.obtenerPeriodosReporte);
router.get('/reporte/consolidado/:anio/:mes', verificarPermisos('Reporte de Planilla', 'Consultar'), reporteCtrl.obtenerReporteConsolidado);

router.get('/boletas/periodos', verificarPermisos('Boletas de Pago', 'Consultar'), boletaCtrl.obtenerPeriodosBoletas);
router.get('/boletas/periodo/:anio/:mes/empleados', verificarPermisos('Boletas de Pago', 'Consultar'), boletaCtrl.obtenerEmpleadosPorPeriodo);
router.get('/boletas/:anio/:mes/:idEmpleado', verificarPermisos('Boletas de Pago', 'Consultar'), boletaCtrl.obtenerBoleta);

router.get('/liquidaciones', verificarPermisos('Liquidacion de Empleado', 'Consultar'), liquidacionCtrl.obtenerLiquidaciones);
router.get('/liquidaciones/:id', verificarPermisos('Liquidacion de Empleado', 'Consultar'), liquidacionCtrl.obtenerPorId);
router.post('/liquidaciones/simular', verificarPermisos('Liquidacion de Empleado', 'Consultar'), liquidacionCtrl.simularLiquidacion);
router.post('/liquidaciones', verificarPermisos('Liquidacion de Empleado', 'Alta'), liquidacionCtrl.crearLiquidacion);
router.put('/liquidaciones/:id', verificarPermisos('Liquidacion de Empleado', 'Cambio'), liquidacionCtrl.actualizarLiquidacion);
router.delete('/liquidaciones/:id', verificarPermisos('Liquidacion de Empleado', 'Baja'), liquidacionCtrl.eliminarLiquidacion);

module.exports = router;
