const { db } = require('../Config/db.js');

async function obtenerTodos() {
  const sql = `
    SELECT m.*, mo.Nombre as NombreModulo 
    FROM MENU m 
    INNER JOIN MODULO mo ON m.IdModulo = mo.IdModulo 
    ORDER BY mo.OrdenMenu ASC, m.OrdenMenu ASC
  `;
  const [rows] = await db.query(sql);
  return rows;
}

async function obtenerPorId(id) {
  const sql = `
    SELECT m.*, mo.Nombre as NombreModulo 
    FROM MENU m 
    INNER JOIN MODULO mo ON m.IdModulo = mo.IdModulo 
    WHERE m.IdMenu = ?
  `;
  const [rows] = await db.query(sql, [id]);
  return rows[0];
}

async function obtenerPorModulo(idModulo) {
  const [rows] = await db.query('SELECT * FROM MENU WHERE IdModulo = ? ORDER BY OrdenMenu ASC', [idModulo]);
  return rows;
}

async function crear(datos) {
  const { IdModulo, Nombre, OrdenMenu, UsuarioCreacion } = datos;
  const sql = `
    INSERT INTO MENU (IdModulo, Nombre, OrdenMenu, FechaCreacion, UsuarioCreacion) 
    VALUES (?, ?, ?, NOW(), ?)
  `;
  const [result] = await db.query(sql, [IdModulo, Nombre, OrdenMenu, UsuarioCreacion]);
  return result.insertId;
}

async function actualizar(id, datos) {
  const { IdModulo, Nombre, OrdenMenu, UsuarioModificacion } = datos;
  const sql = `
    UPDATE MENU 
    SET IdModulo = ?, Nombre = ?, OrdenMenu = ?, FechaModificacion = NOW(), UsuarioModificacion = ? 
    WHERE IdMenu = ?
  `;
  await db.query(sql, [IdModulo, Nombre, OrdenMenu, UsuarioModificacion, id]);
}

async function eliminar(id) {
  await db.query('DELETE FROM MENU WHERE IdMenu = ?', [id]);
}

module.exports = { 
  obtenerTodos, 
  obtenerPorId, 
  obtenerPorModulo, 
  crear, 
  actualizar, 
  eliminar 
};