const express = require('express');
const router = express.Router();
const seguridadController = require('../Controller/seguridadController.js');


const { verificarPermisos } = require('../Middleware/autorizacion.js');


router.get('/modulos', verificarPermisos('Modulos', 'Consultar'), seguridadController.obtenerModulos);
router.get('/menus', verificarPermisos('Menus', 'Consultar'), seguridadController.obtenerMenus);
router.get('/opciones', verificarPermisos('Opciones', 'Consultar'), seguridadController.obtenerOpciones);
router.get('/roles', verificarPermisos('Roles', 'Consultar'), seguridadController.obtenerRoles);
router.post('/roles', verificarPermisos('Roles', 'Alta'), seguridadController.crearRole);
router.get('/permisos/:idRole/:idModulo', verificarPermisos('Asignar Opciones a un Role', 'Consultar'), seguridadController.obtenerMatrizPermisos);
router.post('/permisos', verificarPermisos('Asignar Opciones a un Role', 'Cambio'), seguridadController.guardarMatrizPermisos);

module.exports = router;