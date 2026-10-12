const moduloModel = require('../Model/moduloModel.js');
const menuModel = require('../Model/menuModel.js');
const opcionModel = require('../Model/opcionModel.js');
const roleModel = require('../Model/roleModel.js');
const roleOpcionModel = require('../Model/roleOpcionModel.js');

async function obtenerModulos(req, res) {
  try {
    const modulos = await moduloModel.obtenerTodos();
    res.json(modulos);
  } catch (error) { res.status(500).json({ error: error.message }); }
}

async function obtenerMenus(req, res) {
  try {
    const { idModulo } = req.query;
    const menus = idModulo 
      ? await menuModel.obtenerPorModulo(idModulo)
      : await menuModel.obtenerTodos();
    res.json(menus);
  } catch (error) { res.status(500).json({ error: error.message }); }
}

async function obtenerOpciones(req, res) {
  try {
    const { idMenu } = req.query;
    const opciones = idMenu 
      ? await opcionModel.obtenerPorMenu(idMenu)
      : await opcionModel.obtenerTodos();
    res.json(opciones);
  } catch (error) { res.status(500).json({ error: error.message }); }
}

async function obtenerRoles(req, res) {
  try {
    const roles = await roleModel.obtenerTodos();
    res.json(roles);
  } catch (error) { res.status(500).json({ error: error.message }); }
}

async function crearRole(req, res) {
  try {
    const id = await roleModel.crear(req.body);
    res.status(201).json({ mensaje: 'Rol creado', id });
  } catch (error) { res.status(500).json({ error: error.message }); }
}

async function obtenerMatrizPermisos(req, res) {
  try {
    const { idRole, idModulo } = req.params;
    if (!idRole || !idModulo) {
      return res.status(400).json({ mensaje: 'IdRole e IdModulo son requeridos' });
    }
    const matriz = await roleOpcionModel.obtenerMatrizPermisos(idRole, idModulo);
    res.json(matriz);
  } catch (error) { res.status(500).json({ error: error.message }); }
}

async function guardarMatrizPermisos(req, res) {
  try {
    const permisos = req.body; 
    
    if (!Array.isArray(permisos)) {
      return res.status(400).json({ mensaje: 'Se espera un arreglo de permisos' });
    }

    for (const permiso of permisos) {
      await roleOpcionModel.guardarPermiso(permiso);
    }
    
    res.json({ mensaje: 'Permisos guardados exitosamente' });
  } catch (error) { res.status(500).json({ error: error.message }); }
}

module.exports = {
  obtenerModulos, obtenerMenus, obtenerOpciones,
  obtenerRoles, crearRole, 
  obtenerMatrizPermisos, guardarMatrizPermisos
};