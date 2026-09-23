const { db } = require('../Config/db.js');

async function registrarAcceso(datos) {
  const { IdUsuario, IdTipoAcceso, DireccionIp, HttpUserAgent, Acceso } = datos;
  
  const sql = `
    INSERT INTO BITACORA_ACCESO 
    (IdUsuario, IdTipoAcceso, FechaAcceso, HttpUserAgent, DireccionIp, Acceso)
    VALUES (?, ?, NOW(), ?, ?, ?)
  `;

  const [resultado] = await db.query(sql, [
    IdUsuario, 
    IdTipoAcceso, 
    HttpUserAgent || 'Desconocido', 
    DireccionIp || '127.0.0.1', 
    Acceso
  ]);

  return resultado.insertId;
}

module.exports = { registrarAcceso };