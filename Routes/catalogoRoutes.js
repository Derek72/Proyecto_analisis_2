const express = require('express');
const router = express.Router();
const catalogoController = require('../Controller/catalogoController.js');

const { verificarPermisos } = require('../Middleware/autorizacion.js');

router.get('/empresas', verificarPermisos('Empresas', 'Consultar'), catalogoController.obtenerEmpresas);
router.post('/empresas', verificarPermisos('Empresas', 'Alta'), catalogoController.crearEmpresa);
router.put('/empresas/:id', verificarPermisos('Empresas', 'Cambio'), catalogoController.actualizarEmpresa);

router.get('/sucursales', verificarPermisos('Sucursales', 'Consultar'), catalogoController.obtenerSucursales);
router.post('/sucursales', verificarPermisos('Sucursales', 'Alta'), catalogoController.crearSucursal);
router.put('/sucursales/:id', verificarPermisos('Sucursales', 'Cambio'), catalogoController.actualizarSucursal);

router.get('/generos', verificarPermisos('Géneros', 'Consultar'), catalogoController.obtenerGeneros);

router.get('/status-usuarios', verificarPermisos('Estatus Usuario', 'Consultar'), catalogoController.obtenerStatusUsuarios);

module.exports = router;