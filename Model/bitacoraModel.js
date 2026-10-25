const crypto = require('crypto');
const { db } = require('../Config/db.js');

let columnasBitacoraCache = null;

function detectarDispositivoYBrowser(userAgent) {
  const ua = String(userAgent || '');
  let sistemaOperativo = 'Desconocido';
  let dispositivo = 'Computadora / Escritorio';
  let browser = 'Desconocido';

  if (/Windows NT 10.0/i.test(ua)) sistemaOperativo = 'Windows 10 / 11';
  else if (/Windows NT 6.3/i.test(ua)) sistemaOperativo = 'Windows 8.1';
  else if (/Windows NT 6.2/i.test(ua)) sistemaOperativo = 'Windows 8';
  else if (/Windows NT 6.1/i.test(ua)) sistemaOperativo = 'Windows 7';
  else if (/Windows/i.test(ua)) sistemaOperativo = 'Windows';
  else if (/Android/i.test(ua)) sistemaOperativo = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) sistemaOperativo = 'iOS';
  else if (/Mac OS X/i.test(ua)) sistemaOperativo = 'macOS';
  else if (/Linux/i.test(ua)) sistemaOperativo = 'Linux';

  if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
    dispositivo = 'Tablet';
  } else if (/Mobile|Android|iPhone|iPod/i.test(ua)) {
    dispositivo = 'Móvil';
  }

  if (/Edg\//i.test(ua)) {
    browser = 'Microsoft Edge';
  } else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua) && !/OPR\//i.test(ua)) {
    browser = 'Google Chrome';
  } else if (/Firefox\//i.test(ua)) {
    browser = 'Mozilla Firefox';
  } else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) {
    browser = 'Apple Safari';
  } else if (/OPR\//i.test(ua) || /Opera\//i.test(ua)) {
    browser = 'Opera';
  }

  return { sistemaOperativo, dispositivo, browser };
}

async function asegurarColumnasBitacora() {
  if (columnasBitacoraCache) return columnasBitacoraCache;
  const cols = new Set();
  try {
    const [rows] = await db.query('SHOW COLUMNS FROM BITACORA_ACCESO');
    for (const r of rows) cols.add(r.Field);

    if (!cols.has('SistemaOperativo')) {
      try {
        await db.query('ALTER TABLE BITACORA_ACCESO ADD COLUMN SistemaOperativo VARCHAR(100) NULL AFTER DireccionIp');
        cols.add('SistemaOperativo');
      } catch (_) {}
    }
    if (!cols.has('Dispositivo')) {
      try {
        await db.query('ALTER TABLE BITACORA_ACCESO ADD COLUMN Dispositivo VARCHAR(100) NULL AFTER SistemaOperativo');
        cols.add('Dispositivo');
      } catch (_) {}
    }
    if (!cols.has('Browser')) {
      try {
        await db.query('ALTER TABLE BITACORA_ACCESO ADD COLUMN Browser VARCHAR(100) NULL AFTER Dispositivo');
        cols.add('Browser');
      } catch (_) {}
    }
    if (!cols.has('Sesion')) {
      try {
        await db.query('ALTER TABLE BITACORA_ACCESO ADD COLUMN Sesion VARCHAR(100) NULL AFTER Browser');
        cols.add('Sesion');
      } catch (_) {}
    }
    columnasBitacoraCache = cols;
  } catch (_) {
    columnasBitacoraCache = cols;
  }
  return columnasBitacoraCache;
}

async function registrarAcceso(datos) {
  const { IdUsuario, IdTipoAcceso, DireccionIp, HttpUserAgent, Acceso } = datos;
  const agenteInfo = detectarDispositivoYBrowser(HttpUserAgent);

  const sistemaOperativo = datos.SistemaOperativo || agenteInfo.sistemaOperativo;
  const dispositivo = datos.Dispositivo || agenteInfo.dispositivo;
  const browser = datos.Browser || agenteInfo.browser;
  const sesion = datos.Sesion || crypto.randomUUID();

  const cols = await asegurarColumnasBitacora();

  if (cols.has('SistemaOperativo') && cols.has('Dispositivo') && cols.has('Browser') && cols.has('Sesion')) {
    const sql = `
      INSERT INTO BITACORA_ACCESO 
      (IdUsuario, IdTipoAcceso, FechaAcceso, HttpUserAgent, DireccionIp, Acceso, SistemaOperativo, Dispositivo, Browser, Sesion)
      VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?)
    `;
    const [resultado] = await db.query(sql, [
      IdUsuario,
      IdTipoAcceso,
      HttpUserAgent || 'Desconocido',
      DireccionIp || '127.0.0.1',
      Acceso,
      sistemaOperativo,
      dispositivo,
      browser,
      sesion
    ]);
    return { insertId: resultado.insertId, sesion, sistemaOperativo, dispositivo, browser };
  } else {
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
    return { insertId: resultado.insertId, sesion, sistemaOperativo, dispositivo, browser };
  }
}

module.exports = {
  detectarDispositivoYBrowser,
  asegurarColumnasBitacora,
  registrarAcceso
};