const { db } = require('../Config/db.js');

async function obtenerTodos() {
  const sql = `
    SELECT 
      dp.IdPersona, 
      p.Nombre AS NombrePersona, 
      p.Apellido AS ApellidoPersona,
      dp.IdTipoDocumento, 
      td.Nombre AS NombreTipoDocumento,
      dp.NoDocumento, 
      dp.FechaCreacion, 
      dp.UsuarioCreacion
    FROM DOCUMENTO_PERSONA dp
    INNER JOIN PERSONA p ON dp.IdPersona = p.IdPersona
    INNER JOIN TIPO_DOCUMENTO td ON dp.IdTipoDocumento = td.IdTipoDocumento
    ORDER BY dp.IdPersona ASC, dp.IdTipoDocumento ASC
  `;
  const [rows] = await db.query(sql);
  return rows;
}

async function crear(datos) {
  const { IdPersona, IdTipoDocumento, NoDocumento, UsuarioCreacion } = datos;
  const sql = `
    INSERT INTO DOCUMENTO_PERSONA (IdPersona, IdTipoDocumento, NoDocumento, FechaCreacion, UsuarioCreacion) 
    VALUES (?, ?, ?, NOW(), ?)
  `;
  await db.query(sql, [IdPersona, IdTipoDocumento, NoDocumento, UsuarioCreacion]);
}

async function actualizar(idPersona, idTipoDocumento, datos) {
  const { NoDocumento, UsuarioModificacion } = datos;
  const sql = `
    UPDATE DOCUMENTO_PERSONA 
    SET NoDocumento = ?, FechaModificacion = NOW(), UsuarioModificacion = ? 
    WHERE IdPersona = ? AND IdTipoDocumento = ?
  `;
  await db.query(sql, [NoDocumento, UsuarioModificacion, idPersona, idTipoDocumento]);
}

async function eliminar(idPersona, idTipoDocumento) {
  const sql = 'DELETE FROM DOCUMENTO_PERSONA WHERE IdPersona = ? AND IdTipoDocumento = ?';
  await db.query(sql, [idPersona, idTipoDocumento]);
}

module.exports = { 
  obtenerTodos, 
  crear, 
  actualizar, 
  eliminar 
};
