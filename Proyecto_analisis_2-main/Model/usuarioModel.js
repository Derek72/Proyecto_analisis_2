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
           u.IntentosDeAcceso, u.FechaModificacion, u.IdRole, u.IdSucursal, r.Nombre as NombreRole,
           u.RequiereCambiarPassword, u.UltimaFechaCambioPassword, u.FechaCreacion
    FROM USUARIO u
    INNER JOIN ROLE r ON u.IdRole = r.IdRole
    WHERE u.IdUsuario = ?
  `;
  const [rows] = await db.query(sql, [idUsuario]);
  return rows[0];
}

async function registrarIntentoFallido(idUsuario, intentosActuales) {
  const nuevosIntentos = intentosActuales + 1;
  const sql = `
    UPDATE USUARIO 
    SET IntentosDeAcceso = ?, FechaModificacion = NOW(), UsuarioModificacion = 'system' 
    WHERE IdUsuario = ?
  `;
  await db.query(sql, [nuevosIntentos, idUsuario]);
  return nuevosIntentos;
}

async function bloquearUsuario(idUsuario, idStatusBloqueado) {
  const sql = `
    UPDATE USUARIO 
    SET IdStatusUsuario = ?, FechaModificacion = NOW(), UsuarioModificacion = 'system' 
    WHERE IdUsuario = ?
  `;
  await db.query(sql, [idStatusBloqueado, idUsuario]);
}

async function resetearIntentosYEstado(idUsuario, idStatusActivo) {
  const sql = `
    UPDATE USUARIO 
    SET IntentosDeAcceso = 0, IdStatusUsuario = ?, 
        UltimaFechaIngreso = NOW(), 
        FechaModificacion = NOW(), UsuarioModificacion = 'system'
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
      UsuarioCreacion, UltimaFechaCambioPassword
    )
    VALUES (
      ?, ?, ?, ?, 1, 
      ?, ?, 0, ?, 
      0, ?, ?, 
      ?, ?, ?, NOW(), 
      ?, NOW()
    )
  `;
  
  const creador = UsuarioCreacion || IdUsuario;

  await db.query(sql, [
    IdUsuario, Nombre, Apellido, FechaNacimiento, 
    hashedPassword, IdGenero, CorreoElectronico, 
    TelefonoMovil, IdSucursal, Pregunta, Respuesta, 
    IdRole, creador
  ]);
}

async function obtenerTodos() {
  const sql = `
    SELECT u.IdUsuario, u.Nombre, u.Apellido, u.CorreoElectronico, u.IdStatusUsuario,
           u.IdGenero, u.TelefonoMovil, u.IdSucursal, u.IdRole, u.FechaNacimiento,
           r.Nombre AS NombreRole, s.IdEmpresa
    FROM USUARIO u
    INNER JOIN ROLE r ON u.IdRole = r.IdRole
    LEFT JOIN SUCURSAL s ON u.IdSucursal = s.IdSucursal
    ORDER BY u.Nombre ASC
  `;
  const [rows] = await db.query(sql);
  return rows;
}

async function actualizar(idUsuario, datos) {
  const {
    Nombre, Apellido, FechaNacimiento, IdGenero, CorreoElectronico,
    TelefonoMovil, Pregunta, Respuesta, IdRole, IdStatusUsuario,
    IdSucursal, Fotografia, UsuarioModificacion
  } = datos;

  const sql = `
    UPDATE USUARIO SET
      Nombre = ?, Apellido = ?, FechaNacimiento = ?, IdGenero = ?,
      CorreoElectronico = ?, TelefonoMovil = ?, Pregunta = ?, Respuesta = ?,
      IdRole = ?, IdStatusUsuario = ?, IdSucursal = ?, Fotografia = ?,
      FechaModificacion = NOW(), UsuarioModificacion = ?
    WHERE IdUsuario = ?
  `;

  await db.query(sql, [
    Nombre, Apellido, FechaNacimiento, IdGenero,
    CorreoElectronico, TelefonoMovil, Pregunta, Respuesta,
    IdRole, IdStatusUsuario, IdSucursal, Fotografia,
    UsuarioModificacion, idUsuario
  ]);
}

async function actualizarPasswordAdmin(idUsuario, nuevaPassword, usuarioModificacion) {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(nuevaPassword, salt);

  const sql = `
    UPDATE USUARIO SET
      Password = ?, RequiereCambiarPassword = 1,
      UltimaFechaCambioPassword = NOW(),
      FechaModificacion = NOW(), UsuarioModificacion = ?
    WHERE IdUsuario = ?
  `;

  await db.query(sql, [hashedPassword, usuarioModificacion, idUsuario]);
}

async function eliminar(idUsuario) {
  await db.query('DELETE FROM USUARIO WHERE IdUsuario = ?', [idUsuario]);
}

async function marcarRequiereCambioPassword(idUsuario) {
  const sql = `
    UPDATE USUARIO SET
      RequiereCambiarPassword = 1,
      FechaModificacion = NOW(), UsuarioModificacion = 'system'
    WHERE IdUsuario = ?
  `;
  await db.query(sql, [idUsuario]);
}

async function obtenerParaPerfil(idUsuario) {
  const sql = `
    SELECT u.IdUsuario, u.Nombre, u.Apellido, u.FechaNacimiento, u.CorreoElectronico,
           u.TelefonoMovil, u.IdGenero, u.IdSucursal, u.IdRole, r.Nombre AS NombreRole
    FROM USUARIO u
    INNER JOIN ROLE r ON u.IdRole = r.IdRole
    WHERE u.IdUsuario = ?
  `;
  const [rows] = await db.query(sql, [idUsuario]);
  return rows[0];
}

async function actualizarPerfil(idUsuario, datos) {
  const { Nombre, Apellido, FechaNacimiento, CorreoElectronico, TelefonoMovil, IdGenero } = datos;
  const sql = `
    UPDATE USUARIO SET
      Nombre = ?, Apellido = ?, FechaNacimiento = ?, CorreoElectronico = ?,
      TelefonoMovil = ?, IdGenero = ?, FechaModificacion = NOW(), UsuarioModificacion = ?
    WHERE IdUsuario = ?
  `;
  await db.query(sql, [Nombre, Apellido, FechaNacimiento, CorreoElectronico, TelefonoMovil, IdGenero, idUsuario, idUsuario]);
}

async function cambiarPasswordPropia(idUsuario, nuevaPassword) {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(nuevaPassword, salt);
  const sql = `
    UPDATE USUARIO SET
      Password = ?, RequiereCambiarPassword = 0,
      UltimaFechaCambioPassword = NOW(),
      FechaModificacion = NOW(), UsuarioModificacion = ?
    WHERE IdUsuario = ?
  `;
  await db.query(sql, [hashedPassword, idUsuario, idUsuario]);
}

async function obtenerPregunta(idUsuario) {
  const [rows] = await db.query('SELECT Pregunta FROM USUARIO WHERE IdUsuario = ?', [idUsuario]);
  return rows[0];
}

async function verificarRespuesta(idUsuario, respuesta) {
  const [rows] = await db.query('SELECT Respuesta FROM USUARIO WHERE IdUsuario = ?', [idUsuario]);
  if (!rows.length) return false;
  return rows[0].Respuesta.trim().toLowerCase() === respuesta.trim().toLowerCase();
}

async function restablecerPassword(idUsuario, nuevaPassword) {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(nuevaPassword, salt);
  const sql = `
    UPDATE USUARIO SET
      Password = ?, RequiereCambiarPassword = 0, IntentosDeAcceso = 0,
      IdStatusUsuario = 1, UltimaFechaCambioPassword = NOW(),
      FechaModificacion = NOW(), UsuarioModificacion = ?
    WHERE IdUsuario = ?
  `;
  await db.query(sql, [hashedPassword, idUsuario, idUsuario]);
}

module.exports = {
  buscarParaLogin,
  obtenerPorId,
  registrarIntentoFallido,
  bloquearUsuario,
  resetearIntentosYEstado,
  crearUsuario,
  obtenerTodos,
  actualizar,
  actualizarPasswordAdmin,
  eliminar,
  marcarRequiereCambioPassword,
  obtenerParaPerfil,
  actualizarPerfil,
  cambiarPasswordPropia,
  obtenerPregunta,
  verificarRespuesta,
  restablecerPassword
};