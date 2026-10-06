const { db } = require('../Config/db.js');

async function obtenerTodos() {
  const sql = `
    SELECT 
      p.IdPersona, 
      p.Nombre, 
      p.Apellido, 
      p.FechaNacimiento, 
      p.IdGenero, 
      g.Nombre AS NombreGenero,
      p.Direccion, 
      p.Telefono, 
      p.CorreoElectronico, 
      p.IdEstadoCivil, 
      ec.Nombre AS NombreEstadoCivil,
      p.FechaCreacion, 
      p.UsuarioCreacion
    FROM PERSONA p
    INNER JOIN GENERO g ON p.IdGenero = g.IdGenero
    INNER JOIN ESTADO_CIVIL ec ON p.IdEstadoCivil = ec.IdEstadoCivil
  `;
  const [rows] = await db.query(sql);
  return rows;
}

async function crear(datos) {
  const { Nombre, Apellido, FechaNacimiento, IdGenero, Direccion, Telefono, CorreoElectronico, IdEstadoCivil, UsuarioCreacion } = datos;
  const sql = `
    INSERT INTO PERSONA 
      (Nombre, Apellido, FechaNacimiento, IdGenero, Direccion, Telefono, CorreoElectronico, IdEstadoCivil, FechaCreacion, UsuarioCreacion) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
  `;
  await db.query(sql, [Nombre, Apellido, FechaNacimiento, IdGenero, Direccion, Telefono, CorreoElectronico, IdEstadoCivil, UsuarioCreacion]);
}

async function actualizar(id, datos) {
  const { Nombre, Apellido, FechaNacimiento, IdGenero, Direccion, Telefono, CorreoElectronico, IdEstadoCivil, UsuarioModificacion } = datos;
  const sql = `
    UPDATE PERSONA 
    SET Nombre = ?, Apellido = ?, FechaNacimiento = ?, IdGenero = ?, Direccion = ?, Telefono = ?, CorreoElectronico = ?, IdEstadoCivil = ?, 
        FechaModificacion = NOW(), UsuarioModificacion = ? 
    WHERE IdPersona = ?
  `;
  await db.query(sql, [Nombre, Apellido, FechaNacimiento, IdGenero, Direccion, Telefono, CorreoElectronico, IdEstadoCivil, UsuarioModificacion, id]);
}

async function eliminar(id) {
  const sql = 'DELETE FROM PERSONA WHERE IdPersona = ?';
  await db.query(sql, [id]);
}

module.exports = { 
  obtenerTodos, 
  crear, 
  actualizar, 
  eliminar 
};
