const { db } = require('../Config/db.js');

async function obtenerTodos() {
  const sql = `
    SELECT o.*, m.Nombre as NombreMenu, mo.Nombre as NombreModulo 
    FROM OPCION o 
    INNER JOIN MENU m ON o.IdMenu = m.IdMenu 
    INNER JOIN MODULO mo ON m.IdModulo = mo.IdModulo 
    ORDER BY mo.OrdenMenu ASC, m.OrdenMenu ASC, o.OrdenMenu ASC
  `;
  const [rows] = await db.query(sql);
  return rows;
}

async function obtenerPorId(id) {
  const sql = `
    SELECT o.*, m.Nombre as NombreMenu, mo.Nombre as NombreModulo 
    FROM OPCION o 
    INNER JOIN MENU m ON o.IdMenu = m.IdMenu 
    INNER JOIN MODULO mo ON m.IdModulo = mo.IdModulo 
    WHERE o.IdOpcion = ?
  `;
  const [rows] = await db.query(sql, [id]);
  return rows[0];
}

async function obtenerPorMenu(idMenu) {
  const [rows] = await db.query('SELECT * FROM OPCION WHERE IdMenu = ? ORDER BY OrdenMenu ASC', [idMenu]);
  return rows;
}

async function crear(datos) {
  const { IdMenu, Nombre, OrdenMenu, Pagina, UsuarioCreacion } = datos;
  const sql = `
    INSERT INTO OPCION (IdMenu, Nombre, OrdenMenu, Pagina, FechaCreacion, UsuarioCreacion) 
    VALUES (?, ?, ?, ?, NOW(), ?)
  `;
  const [result] = await db.query(sql, [IdMenu, Nombre, OrdenMenu, Pagina, UsuarioCreacion]);
  return result.insertId;
}

async function actualizar(id, datos) {
  const { IdMenu, Nombre, OrdenMenu, Pagina, UsuarioModificacion } = datos;
  const sql = `
    UPDATE OPCION 
    SET IdMenu = ?, Nombre = ?, OrdenMenu = ?, Pagina = ?, FechaModificacion = NOW(), UsuarioModificacion = ? 
    WHERE IdOpcion = ?
  `;
  await db.query(sql, [IdMenu, Nombre, OrdenMenu, Pagina, UsuarioModificacion, id]);
}

async function eliminar(id) {
  await db.query('DELETE FROM OPCION WHERE IdOpcion = ?', [id]);
}

module.exports = { 
  obtenerTodos, 
  obtenerPorId, 
  obtenerPorMenu, 
  crear, 
  actualizar, 
  eliminar 
};