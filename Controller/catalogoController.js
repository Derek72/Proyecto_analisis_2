const empresaModel = require('../Model/empresaModel.js');
const sucursalModel = require('../Model/sucursalModel.js');
const generoModel = require('../Model/generoModel.js');
const statusUsuarioModel = require('../Model/statusUsuarioModel.js');

async function obtenerEmpresas(req, res) {
  try {
    const empresas = await empresaModel.obtenerTodos();
    res.json(empresas);
  } catch (error) { res.status(500).json({ error: error.message }); }
}

async function crearEmpresa(req, res) {
  try {
    const id = await empresaModel.crear(req.body);
    res.status(201).json({ mensaje: 'Empresa creada', id });
  } catch (error) { res.status(500).json({ error: error.message }); }
}

async function actualizarEmpresa(req, res) {
  try {
    await empresaModel.actualizar(req.params.id, req.body);
    res.json({ mensaje: 'Empresa actualizada exitosamente' });
  } catch (error) { res.status(500).json({ error: error.message }); }
}

async function obtenerSucursales(req, res) {
  try {
    const { idEmpresa } = req.query;
    const sucursales = idEmpresa 
      ? await sucursalModel.obtenerPorEmpresa(idEmpresa)
      : await sucursalModel.obtenerTodos();
    res.json(sucursales);
  } catch (error) { res.status(500).json({ error: error.message }); }
}

async function crearSucursal(req, res) {
  try {
    const id = await sucursalModel.crear(req.body);
    res.status(201).json({ mensaje: 'Sucursal creada', id });
  } catch (error) { res.status(500).json({ error: error.message }); }
}

async function actualizarSucursal(req, res) {
  try {
    await sucursalModel.actualizar(req.params.id, req.body);
    res.json({ mensaje: 'Sucursal actualizada exitosamente' });
  } catch (error) { res.status(500).json({ error: error.message }); }
}

async function obtenerGeneros(req, res) {
  try {
    const generos = await generoModel.obtenerTodos();
    res.json(generos);
  } catch (error) { res.status(500).json({ error: error.message }); }
}

async function obtenerStatusUsuarios(req, res) {
  try {
    const estatus = await statusUsuarioModel.obtenerTodos();
    res.json(estatus);
  } catch (error) { res.status(500).json({ error: error.message }); }
}

module.exports = {
  obtenerEmpresas, crearEmpresa, actualizarEmpresa,
  obtenerSucursales, crearSucursal, actualizarSucursal,
  obtenerGeneros, obtenerStatusUsuarios
};