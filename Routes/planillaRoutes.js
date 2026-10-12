const express = require('express');
const router = express.Router();
const c = require('../Controller/planillaController.js');
const { verificarPermisos } = require('../Middleware/autorizacion.js');

// 10. EMPLEADOS
router.get('/empleados/combos', verificarPermisos('Empleados', 'Consultar'), c.obtenerCombosEmpleado);
router.get('/empleados', verificarPermisos('Empleados', 'Consultar'), c.obtenerEmpleados);
router.post('/empleados', verificarPermisos('Empleados', 'Alta'), c.crearEmpleado);
router.put('/empleados/:id', verificarPermisos('Empleados', 'Cambio'), c.actualizarEmpleado);
router.delete('/empleados/:id', verificarPermisos('Empleados', 'Baja'), c.eliminarEmpleado);

// 11. CUENTAS BANCARIAS DE EMPLEADOS
router.get('/cuentas-bancarias/combos', verificarPermisos('Cuentas Bancarias Empleados', 'Consultar'), c.obtenerCombosCuenta);
router.get('/cuentas-bancarias', verificarPermisos('Cuentas Bancarias Empleados', 'Consultar'), c.obtenerCuentas);
router.post('/cuentas-bancarias', verificarPermisos('Cuentas Bancarias Empleados', 'Alta'), c.crearCuenta);
router.put('/cuentas-bancarias/:id', verificarPermisos('Cuentas Bancarias Empleados', 'Cambio'), c.actualizarCuenta);
router.delete('/cuentas-bancarias/:id', verificarPermisos('Cuentas Bancarias Empleados', 'Baja'), c.eliminarCuenta);

// 12. INASISTENCIAS DE EMPLEADOS
router.get('/inasistencias/empleados', verificarPermisos('Inasistencias de Empleados', 'Consultar'), c.obtenerEmpleadosComboInasistencia);
router.get('/inasistencias', verificarPermisos('Inasistencias de Empleados', 'Consultar'), c.obtenerInasistencias);
router.post('/inasistencias', verificarPermisos('Inasistencias de Empleados', 'Alta'), c.crearInasistencia);
router.put('/inasistencias/:id', verificarPermisos('Inasistencias de Empleados', 'Cambio'), c.actualizarInasistencia);
router.delete('/inasistencias/:id', verificarPermisos('Inasistencias de Empleados', 'Baja'), c.eliminarInasistencia);

// 13. CALCULAR PLANILLA (proceso)
router.get('/periodos', verificarPermisos('Calcular Planilla', 'Consultar'), c.obtenerPeriodos);
router.get('/resultado/:anio/:mes', verificarPermisos('Calcular Planilla', 'Consultar'), c.obtenerResultadoPlanilla);
router.post('/calcular', verificarPermisos('Calcular Planilla', 'Alta'), c.calcularPlanilla);

module.exports = router;
