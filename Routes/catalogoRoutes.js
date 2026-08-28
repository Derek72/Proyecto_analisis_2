const express = require('express');
const router = express.Router();
const catalogoController = require('../Controller/catalogoController.js');

const { verificarPermisos } = require('../Middleware/autorizacion.js');

//RUTAS PARA EMPRESAS
router.get('/empresas', verificarPermisos('Empresas', 'Consultar'), catalogoController.obtenerEmpresas);
router.post('/empresas', verificarPermisos('Empresas', 'Alta'), catalogoController.crearEmpresa);
router.put('/empresas/:id', verificarPermisos('Empresas', 'Cambio'), catalogoController.actualizarEmpresa);
router.delete('/empresas/:id', verificarPermisos('Empresas', 'Baja'), catalogoController.eliminarEmpresa);

//RUTAS PARA SUCURSALES
router.get('/sucursales', verificarPermisos('Sucursales', 'Consultar'), catalogoController.obtenerSucursales);
router.post('/sucursales', verificarPermisos('Sucursales', 'Alta'), catalogoController.crearSucursal);
router.put('/sucursales/:id', verificarPermisos('Sucursales', 'Cambio'), catalogoController.actualizarSucursal);
router.delete('/sucursales/:id', verificarPermisos('Sucursales', 'Baja'), catalogoController.eliminarSucursal);
router.get('/sucursales/empresa/:id', verificarPermisos('Sucursales', 'Consultar'), catalogoController.obtenerSucursalesPorEmpresa);

//RUTAS PARA GENEROS
router.get('/generos', verificarPermisos('Géneros', 'Consultar'), catalogoController.obtenerGeneros);
router.post('/generos', verificarPermisos('Géneros', 'Alta'), catalogoController.crearGenero);
router.put('/generos/:id', verificarPermisos('Géneros', 'Cambio'), catalogoController.actualizarGenero);
router.delete('/generos/:id', verificarPermisos('Géneros', 'Baja'), catalogoController.eliminarGenero);

//RUTAS PARA STATUS USUARIOS
router.get('/estatus-usuarios', verificarPermisos('Estatus Usuario', 'Consultar'), catalogoController.obtenerStatusUsuarios);
router.post('/estatus-usuarios', verificarPermisos('Estatus Usuario', 'Alta'), catalogoController.crearEstatusUsuario);
router.put('/estatus-usuarios/:id', verificarPermisos('Estatus Usuario', 'Cambio'), catalogoController.actualizarEstatusUsuario);
router.delete('/estatus-usuarios/:id', verificarPermisos('Estatus Usuario', 'Baja'), catalogoController.eliminarEstatusUsuario);

//RUTAS PARA ROLES
router.get('/roles', verificarPermisos('Roles', 'Consultar'), catalogoController.obtenerRoles);
router.post('/roles', verificarPermisos('Roles', 'Alta'), catalogoController.crearRol);
router.put('/roles/:id', verificarPermisos('Roles', 'Cambio'), catalogoController.actualizarRol);
router.delete('/roles/:id', verificarPermisos('Roles', 'Baja'), catalogoController.eliminarRol);

//RUTAS PARA MODULOS
router.get('/modulos', verificarPermisos('Modulos', 'Consultar'), catalogoController.obtenerModulos);
router.post('/modulos', verificarPermisos('Modulos', 'Alta'), catalogoController.crearModulo);
router.put('/modulos/:id', verificarPermisos('Modulos', 'Cambio'), catalogoController.actualizarModulo);
router.delete('/modulos/:id', verificarPermisos('Modulos', 'Baja'), catalogoController.eliminarModulo);

//RUTAS PARA MENUS
router.get('/menus', verificarPermisos('Menus', 'Consultar'), catalogoController.obtenerMenus);
router.post('/menus', verificarPermisos('Menus', 'Alta'), catalogoController.crearMenu);
router.put('/menus/:id', verificarPermisos('Menus', 'Cambio'), catalogoController.actualizarMenu);
router.delete('/menus/:id', verificarPermisos('Menus', 'Baja'), catalogoController.eliminarMenu);

//RUTAS PARA OPCIONES
router.get('/opciones', verificarPermisos('Opciones', 'Consultar'), catalogoController.obtenerOpciones);
router.post('/opciones', verificarPermisos('Opciones', 'Alta'), catalogoController.crearOpcion);
router.put('/opciones/:id', verificarPermisos('Opciones', 'Cambio'), catalogoController.actualizarOpcion);
router.delete('/opciones/:id', verificarPermisos('Opciones', 'Baja'), catalogoController.eliminarOpcion);

//RUTAS PARA USUARIOS
router.get('/usuarios', verificarPermisos('Usuarios', 'Consultar'), catalogoController.obtenerUsuarios);
router.post('/usuarios', verificarPermisos('Usuarios', 'Alta'), catalogoController.crearUsuario);
router.put('/usuarios/:id', verificarPermisos('Usuarios', 'Cambio'), catalogoController.actualizarUsuario);
router.delete('/usuarios/:id', verificarPermisos('Usuarios', 'Baja'), catalogoController.eliminarUsuario);
module.exports = router;