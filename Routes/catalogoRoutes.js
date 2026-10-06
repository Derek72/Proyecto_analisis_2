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
router.get('/generos', verificarPermisos('Generos', 'Consultar'), catalogoController.obtenerGeneros);
router.post('/generos', verificarPermisos('Generos', 'Alta'), catalogoController.crearGenero);
router.put('/generos/:id', verificarPermisos('Generos', 'Cambio'), catalogoController.actualizarGenero);
router.delete('/generos/:id', verificarPermisos('Generos', 'Baja'), catalogoController.eliminarGenero);

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

//RUTAS PARA ESTADOS CIVILES
router.get('/estados-civiles', verificarPermisos('Estados Civiles', 'Consultar'), catalogoController.obtenerEstadosCiviles);
router.post('/estados-civiles', verificarPermisos('Estados Civiles', 'Alta'), catalogoController.crearEstadoCivil);
router.put('/estados-civiles/:id', verificarPermisos('Estados Civiles', 'Cambio'), catalogoController.actualizarEstadoCivil);
router.delete('/estados-civiles/:id', verificarPermisos('Estados Civiles', 'Baja'), catalogoController.eliminarEstadoCivil);

//RUTAS PARA STATUS DE EMPLEADOS
router.get('/status-empleados', verificarPermisos('Status Empleado', 'Consultar'), catalogoController.obtenerStatusEmpleados);
router.post('/status-empleados', verificarPermisos('Status Empleado', 'Alta'), catalogoController.crearStatusEmpleado);
router.put('/status-empleados/:id', verificarPermisos('Status Empleado', 'Cambio'), catalogoController.actualizarStatusEmpleado);
router.delete('/status-empleados/:id', verificarPermisos('Status Empleado', 'Baja'), catalogoController.eliminarStatusEmpleado);

//RUTAS PARA FLUJO STATUS DE EMPLEADOS
router.get('/flujos-status', verificarPermisos('Flujos Status Empleado', 'Consultar'), catalogoController.obtenerFlujosStatus);
router.post('/flujos-status', verificarPermisos('Flujos Status Empleado', 'Alta'), catalogoController.crearFlujoStatus);
router.put('/flujos-status/:idActual/:idNuevo', verificarPermisos('Flujos Status Empleado', 'Cambio'), catalogoController.actualizarFlujoStatus);
router.delete('/flujos-status/:idActual/:idNuevo', verificarPermisos('Flujos Status Empleado', 'Baja'), catalogoController.eliminarFlujoStatus);

// RUTAS PARA TIPOS DE DOCUMENTOS
router.get('/tipos-documentos', verificarPermisos('Tipos de Documentos', 'Consultar'), catalogoController.obtenerTiposDocumentos);
router.post('/tipos-documentos', verificarPermisos('Tipos de Documentos', 'Alta'), catalogoController.crearTipoDocumento);
router.put('/tipos-documentos/:id', verificarPermisos('Tipos de Documentos', 'Cambio'), catalogoController.actualizarTipoDocumento);
router.delete('/tipos-documentos/:id', verificarPermisos('Tipos de Documentos', 'Baja'), catalogoController.eliminarTipoDocumento);

// RUTAS PARA DEPARTAMENTOS
router.get('/departamentos', verificarPermisos('Departamentos', 'Consultar'), catalogoController.obtenerDepartamentos);
router.post('/departamentos', verificarPermisos('Departamentos', 'Alta'), catalogoController.crearDepartamento);
router.put('/departamentos/:id', verificarPermisos('Departamentos', 'Cambio'), catalogoController.actualizarDepartamento);
router.delete('/departamentos/:id', verificarPermisos('Departamentos', 'Baja'), catalogoController.eliminarDepartamento);

// RUTAS PARA PUESTOS
router.get('/puestos', verificarPermisos('Puestos', 'Consultar'), catalogoController.obtenerPuestos);
router.post('/puestos', verificarPermisos('Puestos', 'Alta'), catalogoController.crearPuesto);
router.put('/puestos/:id', verificarPermisos('Puestos', 'Cambio'), catalogoController.actualizarPuesto);
router.delete('/puestos/:id', verificarPermisos('Puestos', 'Baja'), catalogoController.eliminarPuesto);

// RUTAS PARA PERSONAS
router.get('/personas', verificarPermisos('Personas', 'Consultar'), catalogoController.obtenerPersonas);
router.post('/personas', verificarPermisos('Personas', 'Alta'), catalogoController.crearPersona);
router.put('/personas/:id', verificarPermisos('Personas', 'Cambio'), catalogoController.actualizarPersona);
router.delete('/personas/:id', verificarPermisos('Personas', 'Baja'), catalogoController.eliminarPersona);

// RUTAS PARA DOCUMENTOS DE PERSONAS (PK compuesta: IdPersona + IdTipoDocumento)
router.get('/documentos-persona', verificarPermisos('Documentos de Personas', 'Consultar'), catalogoController.obtenerDocumentosPersona);
router.post('/documentos-persona', verificarPermisos('Documentos de Personas', 'Alta'), catalogoController.crearDocumentoPersona);
router.put('/documentos-persona/:idPersona/:idTipoDocumento', verificarPermisos('Documentos de Personas', 'Cambio'), catalogoController.actualizarDocumentoPersona);
router.delete('/documentos-persona/:idPersona/:idTipoDocumento', verificarPermisos('Documentos de Personas', 'Baja'), catalogoController.eliminarDocumentoPersona);

// RUTAS PARA BANCOS
router.get('/bancos', verificarPermisos('Bancos', 'Consultar'), catalogoController.obtenerBancos);
router.post('/bancos', verificarPermisos('Bancos', 'Alta'), catalogoController.crearBanco);
router.put('/bancos/:id', verificarPermisos('Bancos', 'Cambio'), catalogoController.actualizarBanco);
router.delete('/bancos/:id', verificarPermisos('Bancos', 'Baja'), catalogoController.eliminarBanco);

module.exports = router;