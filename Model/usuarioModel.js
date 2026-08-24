const { db } = require('../Config/db.js');
const bcrypt = require('bcrypt');

async function buscarParaLogin(idUsuario, password) {
  const sql = `
    SELECT u.IdUsuario, u.Nombre, u.Apellido, u.CorreoElectronico, u.IdStatusUsuario, 
           u.IntentosDeAcceso, u.FechaModificacion, u.IdRole, r.Nombre as NombreRole
    FROM USUARIO u
    INNER JOIN ROLE r ON u.IdRole = r.IdRole
    WHERE u.IdUsuario = ? AND u.Password = ?
  `;
  const [rows] = await db.query(sql, [idUsuario, password]);
  return rows[0];
}

async function obtenerPorId(idUsuario) {
  const sql = `
    SELECT u.IdUsuario, u.Password, u.Nombre, u.Apellido, u.CorreoElectronico, u.IdStatusUsuario, 
           u.IntentosDeAcceso, u.FechaModificacion, u.IdRole, r.Nombre as NombreRole
    FROM USUARIO u
    INNER JOIN ROLE r ON u.IdRole = r.IdRole
    WHERE u.IdUsuario = ?
  `;
  const [rows] = await db.query(sql, [idUsuario]);
  return rows[0];
}

async function registrarIntentoFallido(idUsuario, intentosActuales) {
  const nuevosIntentos = intentosActuales + 1;
  const sql = `UPDATE USUARIO SET IntentosDeAcceso = ? WHERE IdUsuario = ?`;
  await db.query(sql, [nuevosIntentos, idUsuario]);
  return nuevosIntentos;
}

async function bloquearUsuario(idUsuario, idStatusBloqueado) {
  const sql = `
    UPDATE USUARIO 
    SET IdStatusUsuario = ?, FechaModificacion = NOW() 
    WHERE IdUsuario = ?
  `;
  await db.query(sql, [idStatusBloqueado, idUsuario]);
}

async function resetearIntentosYEstado(idUsuario, idStatusActivo) {
  const sql = `
    UPDATE USUARIO 
    SET IntentosDeAcceso = 0, IdStatusUsuario = ? 
    WHERE IdUsuario = ?
  `;
  await db.query(sql, [idStatusActivo, idUsuario]);
}

async function crearUsuario(usuario) {
  const { 
    IdUsuario, Nombre, Apellido, FechaNacimiento, Password, 
    IdGenero, CorreoElectronico, TelefonoMovil, IdSucursal, 
    Pregunta, Respuesta, IdRole, UsuarioCreacion 
  } = usuario;
  
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(Password, salt);

  const sql = `
    INSERT INTO USUARIO (
      IdUsuario, Nombre, Apellido, FechaNacimiento, IdStatusUsuario, 
      Password, IdGenero, IntentosDeAcceso, CorreoElectronico, 
      RequiereCambiarPassword, TelefonoMovil, IdSucursal, 
      Pregunta, Respuesta, IdRole, FechaCreacion, 
      UsuarioCreacion, FechaModificacion, UsuarioModificacion
    )
    VALUES (
      ?, ?, ?, ?, 1, 
      ?, ?, 0, ?, 
      0, ?, ?, 
      ?, ?, ?, NOW(), 
      ?, NOW(), ?
    )
  `;
  
  const creador = UsuarioCreacion || IdUsuario;

  await db.query(sql, [
    IdUsuario, Nombre, Apellido, FechaNacimiento, 
    hashedPassword, IdGenero, CorreoElectronico, 
    TelefonoMovil, IdSucursal, Pregunta, Respuesta, 
    IdRole, creador, creador
  ]);
}

module.exports = {
  buscarParaLogin,
  obtenerPorId,
  registrarIntentoFallido,
  bloquearUsuario,
  resetearIntentosYEstado,
  crearUsuario
};