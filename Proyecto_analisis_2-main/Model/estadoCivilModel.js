const { db } = require('../Config/db.js');

async function obtenerTodos() {
  const [rows] = await db.query('SELECT * FROM ESTADO_CIVIL');
  return rows;
}

async function obtenerPorId(id) {
  const [rows] = await db.query('SELECT * FROM ESTADO_CIVIL WHERE IdEstadoCivil = ?', [id]);
  return rows[0];
}

async function crear(datos) {
  const { Nombre, UsuarioCreacion } = datos;
  const sql = `
    INSERT INTO ESTADO_CIVIL (Nombre, FechaCreacion, UsuarioCreacion) 
    VALUES (?, NOW(), ?)
  `;
  const [result] = await db.query(sql, [Nombre, UsuarioCreacion]);
  return result.insertId;
}

async function actualizar(id, datos) {
  const { Nombre, UsuarioModificacion } = datos;
  const sql = `
    UPDATE ESTADO_CIVIL 
    SET Nombre = ?, FechaModificacion = NOW(), UsuarioModificacion = ? 
    WHERE IdEstadoCivil = ?
  `;
  await db.query(sql, [Nombre, UsuarioModificacion, id]);
}

async function eliminar(id) {
  await db.query('DELETE FROM ESTADO_CIVIL WHERE IdEstadoCivil = ?', [id]);
}

module.exports = { 
  obtenerTodos, 
  obtenerPorId, 
  crear, 
  actualizar, 
  eliminar 
};