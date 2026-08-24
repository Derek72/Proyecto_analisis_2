const { db } = require('../Config/db.js');

async function obtenerTodos() {
  const [rows] = await db.query('SELECT * FROM STATUS_USUARIO');
  return rows;
}

async function obtenerPorId(id) {
  const [rows] = await db.query('SELECT * FROM STATUS_USUARIO WHERE IdStatusUsuario = ?', [id]);
  return rows[0];
}

async function crear(datos) {
  const { Nombre, UsuarioCreacion } = datos;
  const sql = `
    INSERT INTO STATUS_USUARIO (Nombre, FechaCreacion, UsuarioCreacion) 
    VALUES (?, NOW(), ?)
  `;
  const [result] = await db.query(sql, [Nombre, UsuarioCreacion]);
  return result.insertId;
}

async function actualizar(id, datos) {
  const { Nombre, UsuarioModificacion } = datos;
  const sql = `
    UPDATE STATUS_USUARIO 
    SET Nombre = ?, FechaModificacion = NOW(), UsuarioModificacion = ? 
    WHERE IdStatusUsuario = ?
  `;
  await db.query(sql, [Nombre, UsuarioModificacion, id]);
}

async function eliminar(id) {
  await db.query('DELETE FROM STATUS_USUARIO WHERE IdStatusUsuario = ?', [id]);
}

module.exports = { 
  obtenerTodos, 
  obtenerPorId, 
  crear, 
  actualizar, 
  eliminar 
};