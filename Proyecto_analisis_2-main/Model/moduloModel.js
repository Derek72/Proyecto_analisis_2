const { db } = require('../Config/db.js');

async function obtenerTodos() {
  const [rows] = await db.query('SELECT * FROM MODULO ORDER BY OrdenMenu ASC');
  return rows;
}

async function obtenerPorId(id) {
  const [rows] = await db.query('SELECT * FROM MODULO WHERE IdModulo = ?', [id]);
  return rows[0];
}

async function crear(datos) {
  const { Nombre, OrdenMenu, UsuarioCreacion } = datos;
  const sql = `
    INSERT INTO MODULO (Nombre, OrdenMenu, FechaCreacion, UsuarioCreacion) 
    VALUES (?, ?, NOW(), ?)
  `;
  const [result] = await db.query(sql, [Nombre, OrdenMenu, UsuarioCreacion]);
  return result.insertId;
}

async function actualizar(id, datos) {
  const { Nombre, OrdenMenu, UsuarioModificacion } = datos;
  const sql = `
    UPDATE MODULO 
    SET Nombre = ?, OrdenMenu = ?, FechaModificacion = NOW(), UsuarioModificacion = ? 
    WHERE IdModulo = ?
  `;
  await db.query(sql, [Nombre, OrdenMenu, UsuarioModificacion, id]);
}

async function eliminar(id) {
  await db.query('DELETE FROM MODULO WHERE IdModulo = ?', [id]);
}

module.exports = { 
  obtenerTodos, 
  obtenerPorId, 
  crear, 
  actualizar, 
  eliminar 
};