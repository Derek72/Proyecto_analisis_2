const { db } = require('../Config/db.js');

async function obtenerTodos() {
  const [rows] = await db.query('SELECT * FROM EMPRESA');
  return rows;
}

async function obtenerPorId(id) {
  const [rows] = await db.query('SELECT * FROM EMPRESA WHERE IdEmpresa = ?', [id]);
  return rows[0];
}

async function obtenerPoliticasPassword(idEmpresa) {
  const sql = `
    SELECT 
      PasswordCantidadMayusculas, 
      PasswordCantidadMinusculas, 
      PasswordCantidadCaracteresEspeciales, 
      PasswordCantidadCaducidadDias, 
      PasswordLargo, 
      PasswordIntentosAntesDeBloquear, 
      PasswordCantidadNumeros, 
      PasswordCantidadPreguntasValidar 
    FROM EMPRESA 
    WHERE IdEmpresa = ?
  `;
  const [rows] = await db.query(sql, [idEmpresa]);
  return rows[0];
}

async function crear(datos) {
  const { 
    Nombre, Direccion, Nit, PasswordCantidadMayusculas, 
    PasswordCantidadMinusculas, PasswordCantidadCaracteresEspeciales, 
    PasswordCantidadCaducidadDias, PasswordLargo, PasswordIntentosAntesDeBloquear, 
    PasswordCantidadNumeros, PasswordCantidadPreguntasValidar, UsuarioCreacion 
  } = datos;

  const sql = `
    INSERT INTO EMPRESA (
      Nombre, Direccion, Nit, PasswordCantidadMayusculas, 
      PasswordCantidadMinusculas, PasswordCantidadCaracteresEspeciales, 
      PasswordCantidadCaducidadDias, PasswordLargo, PasswordIntentosAntesDeBloquear, 
      PasswordCantidadNumeros, PasswordCantidadPreguntasValidar, 
      FechaCreacion, UsuarioCreacion
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
  `;
  
  const [result] = await db.query(sql, [
    Nombre, Direccion, Nit, PasswordCantidadMayusculas, 
    PasswordCantidadMinusculas, PasswordCantidadCaracteresEspeciales, 
    PasswordCantidadCaducidadDias, PasswordLargo, PasswordIntentosAntesDeBloquear, 
    PasswordCantidadNumeros, PasswordCantidadPreguntasValidar, UsuarioCreacion
  ]);
  return result.insertId;
}

async function actualizar(id, datos) {
  const { 
    Nombre, Direccion, Nit, PasswordCantidadMayusculas, 
    PasswordCantidadMinusculas, PasswordCantidadCaracteresEspeciales, 
    PasswordCantidadCaducidadDias, PasswordLargo, PasswordIntentosAntesDeBloquear, 
    PasswordCantidadNumeros, PasswordCantidadPreguntasValidar, UsuarioModificacion 
  } = datos;

  const sql = `
    UPDATE EMPRESA SET 
      Nombre = ?, Direccion = ?, Nit = ?, 
      PasswordCantidadMayusculas = ?, PasswordCantidadMinusculas = ?, 
      PasswordCantidadCaracteresEspeciales = ?, PasswordCantidadCaducidadDias = ?, 
      PasswordLargo = ?, PasswordIntentosAntesDeBloquear = ?, 
      PasswordCantidadNumeros = ?, PasswordCantidadPreguntasValidar = ?, 
      FechaModificacion = NOW(), UsuarioModificacion = ? 
    WHERE IdEmpresa = ?
  `;
  
  await db.query(sql, [
    Nombre, Direccion, Nit, PasswordCantidadMayusculas, 
    PasswordCantidadMinusculas, PasswordCantidadCaracteresEspeciales, 
    PasswordCantidadCaducidadDias, PasswordLargo, PasswordIntentosAntesDeBloquear, 
    PasswordCantidadNumeros, PasswordCantidadPreguntasValidar, UsuarioModificacion, id
  ]);
}

async function eliminar(id) {
  await db.query('DELETE FROM EMPRESA WHERE IdEmpresa = ?', [id]);
}

module.exports = { 
  obtenerTodos, 
  obtenerPorId, 
  obtenerPoliticasPassword, 
  crear, 
  actualizar, 
  eliminar 
};