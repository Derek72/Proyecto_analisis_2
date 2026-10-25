const { db } = require('../Config/db.js');

async function obtenerTodos() {
  const sql = 'SELECT IdTipoDocumento, Nombre, FechaCreacion, UsuarioCreacion, FechaModificacion, UsuarioModificacion FROM TIPO_DOCUMENTO ORDER BY IdTipoDocumento ASC';
  const [rows] = await db.query(sql);
  return rows;
}

async function crear(datos) {
  const { Nombre, UsuarioCreacion } = datos;
  const sql = 'INSERT INTO TIPO_DOCUMENTO (Nombre, FechaCreacion, UsuarioCreacion) VALUES (?, NOW(), ?)';
  await db.query(sql, [Nombre, UsuarioCreacion]);
}

async function actualizar(id, datos) {
  const { Nombre, UsuarioModificacion } = datos;
  const sql = 'UPDATE TIPO_DOCUMENTO SET Nombre = ?, FechaModificacion = NOW(), UsuarioModificacion = ? WHERE IdTipoDocumento = ?';
  await db.query(sql, [Nombre, UsuarioModificacion, id]);
}

async function eliminar(id) {
  const sql = 'DELETE FROM TIPO_DOCUMENTO WHERE IdTipoDocumento = ?';
  await db.query(sql, [id]);
}

module.exports = { 
  obtenerTodos, 
  crear, 
  actualizar, 
  eliminar 
};