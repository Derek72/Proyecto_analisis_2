const { db } = require('../Config/db.js');

async function obtenerTodos() {
  const [rows] = await db.query('SELECT * FROM GENERO');
  return rows;
}

async function obtenerPorId(id) {
  const [rows] = await db.query('SELECT * FROM GENERO WHERE IdGenero = ?', [id]);
  return rows[0];
}

async function crear(datos) {
  const { Nombre, UsuarioCreacion } = datos;
  const sql = `
    INSERT INTO GENERO (Nombre, FechaCreacion, UsuarioCreacion) 
    VALUES (?, NOW(), ?)
  `;
  const [result] = await db.query(sql, [Nombre, UsuarioCreacion]);
  return result.insertId;
}

async function actualizar(id, datos) {
  const { Nombre, UsuarioModificacion } = datos;
  const sql = `
    UPDATE GENERO 
    SET Nombre = ?, FechaModificacion = NOW(), UsuarioModificacion = ? 
    WHERE IdGenero = ?
  `;
  await db.query(sql, [Nombre, UsuarioModificacion, id]);
}

async function eliminar(id) {

  await db.query('DELETE FROM GENERO WHERE IdGenero = ?', [id]);
}

module.exports = { 
  obtenerTodos, 
  obtenerPorId, 
  crear, 
  actualizar, 
  eliminar 
};