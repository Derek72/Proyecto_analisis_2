const { db } = require('../Config/db.js');

async function obtenerTodos() {
  const [rows] = await db.query('SELECT s.*, e.Nombre as NombreEmpresa FROM SUCURSAL s INNER JOIN EMPRESA e ON s.IdEmpresa = e.IdEmpresa');
  return rows;
}

async function obtenerPorId(id) {
  const [rows] = await db.query('SELECT * FROM SUCURSAL WHERE IdSucursal = ?', [id]);
  return rows[0];
}

async function obtenerPorEmpresa(idEmpresa) {
  const [rows] = await db.query('SELECT * FROM SUCURSAL WHERE IdEmpresa = ?', [idEmpresa]);
  return rows;
}

async function crear(datos) {
  const { Nombre, Direccion, IdEmpresa, UsuarioCreacion } = datos;
  const sql = `INSERT INTO SUCURSAL (Nombre, Direccion, IdEmpresa, FechaCreacion, UsuarioCreacion) VALUES (?, ?, ?, NOW(), ?)`;
  const [result] = await db.query(sql, [Nombre, Direccion, IdEmpresa, UsuarioCreacion]);
  return result.insertId;
}

async function actualizar(id, datos) {
  const { Nombre, Direccion, IdEmpresa, UsuarioModificacion } = datos;
  const sql = `UPDATE SUCURSAL SET Nombre = ?, Direccion = ?, IdEmpresa = ?, FechaModificacion = NOW(), UsuarioModificacion = ? WHERE IdSucursal = ?`;
  await db.query(sql, [Nombre, Direccion, IdEmpresa, UsuarioModificacion, id]);
}

async function eliminar(id) {
  await db.query('DELETE FROM SUCURSAL WHERE IdSucursal = ?', [id]);
}

module.exports = { obtenerTodos, obtenerPorId, obtenerPorEmpresa, crear, actualizar, eliminar };