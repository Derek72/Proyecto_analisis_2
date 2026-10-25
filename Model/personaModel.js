const { db } = require('../Config/db.js');

async function obtenerTodos() {
  const sql = `
    SELECT 
      p.IdPersona, 
      p.Nombre, 
      p.Apellido, 
      DATE_FORMAT(p.FechaNacimiento, '%Y-%m-%d') AS FechaNacimiento, 
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
    ORDER BY p.IdPersona ASC
  `;
  const [rows] = await db.query(sql);
  return rows;
}

function normalizarFechaIso(valor) {
  if (!valor) return null;
  const texto = String(valor).trim();
  const matchIso = texto.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (matchIso) {
    return `${matchIso[1]}-${matchIso[2].padStart(2, '0')}-${matchIso[3].padStart(2, '0')}`;
  }
  const matchEsp = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (matchEsp) {
    return `${matchEsp[3]}-${matchEsp[2].padStart(2, '0')}-${matchEsp[1].padStart(2, '0')}`;
  }
  return texto;
}

async function crear(datos) {
  const { Nombre, Apellido, FechaNacimiento, IdGenero, Direccion, Telefono, CorreoElectronico, IdEstadoCivil, UsuarioCreacion } = datos;
  const fechaNacIso = normalizarFechaIso(FechaNacimiento);
  const sql = `
    INSERT INTO PERSONA 
      (Nombre, Apellido, FechaNacimiento, IdGenero, Direccion, Telefono, CorreoElectronico, IdEstadoCivil, FechaCreacion, UsuarioCreacion) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
  `;
  await db.query(sql, [Nombre, Apellido, fechaNacIso, IdGenero, Direccion, Telefono, CorreoElectronico, IdEstadoCivil, UsuarioCreacion]);
}

async function actualizar(id, datos) {
  const { Nombre, Apellido, FechaNacimiento, IdGenero, Direccion, Telefono, CorreoElectronico, IdEstadoCivil, UsuarioModificacion } = datos;
  const fechaNacIso = normalizarFechaIso(FechaNacimiento);
  const sql = `
    UPDATE PERSONA 
    SET Nombre = ?, Apellido = ?, FechaNacimiento = ?, IdGenero = ?, Direccion = ?, Telefono = ?, CorreoElectronico = ?, IdEstadoCivil = ?, 
        FechaModificacion = NOW(), UsuarioModificacion = ? 
    WHERE IdPersona = ?
  `;
  await db.query(sql, [Nombre, Apellido, fechaNacIso, IdGenero, Direccion, Telefono, CorreoElectronico, IdEstadoCivil, UsuarioModificacion, id]);
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
