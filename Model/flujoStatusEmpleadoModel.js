const { db } = require('../Config/db.js');

async function obtenerTodos() {
  const sql = `
    SELECT 
      f.IdStatusActual,
      f.IdStatusNuevo,
      s1.Nombre AS StatusActual,
      s2.Nombre AS StatusNuevo,
      f.NombreEvento,
      f.FechaCreacion,
      f.UsuarioCreacion
    FROM FLUJO_STATUS_EMPLEADO f
    INNER JOIN STATUS_EMPLEADO s1 ON f.IdStatusActual = s1.IdStatusEmpleado
    INNER JOIN STATUS_EMPLEADO s2 ON f.IdStatusNuevo = s2.IdStatusEmpleado
  `;
  const [rows] = await db.query(sql);
  return rows;
}

async function crear(datos) {
  const { IdStatusActual, IdStatusNuevo, NombreEvento, UsuarioCreacion } = datos;
  const sql = `
    INSERT INTO FLUJO_STATUS_EMPLEADO 
      (IdStatusActual, IdStatusNuevo, NombreEvento, FechaCreacion, UsuarioCreacion) 
    VALUES (?, ?, ?, NOW(), ?)
  `;
  await db.query(sql, [IdStatusActual, IdStatusNuevo, NombreEvento, UsuarioCreacion]);
}

async function actualizar(idStatusActual, idStatusNuevo, datos) {
  const { NombreEvento, UsuarioModificacion } = datos;
  const sql = `
    UPDATE FLUJO_STATUS_EMPLEADO 
    SET NombreEvento = ?, FechaModificacion = NOW(), UsuarioModificacion = ? 
    WHERE IdStatusActual = ? AND IdStatusNuevo = ?
  `;
  await db.query(sql, [NombreEvento, UsuarioModificacion, idStatusActual, idStatusNuevo]);
}

async function eliminar(idStatusActual, idStatusNuevo) {
  const sql = 'DELETE FROM FLUJO_STATUS_EMPLEADO WHERE IdStatusActual = ? AND IdStatusNuevo = ?';
  await db.query(sql, [idStatusActual, idStatusNuevo]);
}

module.exports = { 
  obtenerTodos, 
  crear, 
  actualizar, 
  eliminar 
};