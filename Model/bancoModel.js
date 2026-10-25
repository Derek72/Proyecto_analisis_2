const { db } = require('../Config/db.js');

async function obtenerTodos() {
  const sql = 'SELECT IdBanco, Nombre, FechaCreacion, UsuarioCreacion, FechaModificacion, UsuarioModificacion FROM BANCO ORDER BY IdBanco ASC';
  const [rows] = await db.query(sql);
  return rows;
}

async function crear(datos) {
  const { Nombre, UsuarioCreacion } = datos;
  const sql = 'INSERT INTO BANCO (Nombre, FechaCreacion, UsuarioCreacion) VALUES (?, NOW(), ?)';
  await db.query(sql, [Nombre, UsuarioCreacion]);
}

async function actualizar(id, datos) {
  const { Nombre, UsuarioModificacion } = datos;
  const sql = 'UPDATE BANCO SET Nombre = ?, FechaModificacion = NOW(), UsuarioModificacion = ? WHERE IdBanco = ?';
  await db.query(sql, [Nombre, UsuarioModificacion, id]);
}

async function eliminar(id) {
  const sql = 'DELETE FROM BANCO WHERE IdBanco = ?';
  await db.query(sql, [id]);
}

module.exports = { 
  obtenerTodos, 
  crear, 
  actualizar, 
  eliminar 
};
