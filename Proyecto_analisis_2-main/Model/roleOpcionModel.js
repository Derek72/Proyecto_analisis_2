const { db } = require('../Config/db.js');

// 1. Obtener la matriz de permisos para la Cuadrícula (DataGrid)
// Hace un LEFT JOIN para traer TODAS las opciones de un módulo, marcando con 1 o 0 si el Rol ya tiene el permiso.
async function obtenerMatrizPermisos(idRole, idModulo) {
  const sql = `
    SELECT 
      o.IdOpcion, 
      o.Nombre AS NombreOpcion, 
      m.Nombre AS NombreMenu,
      COALESCE(ro.Consultar, 0) AS Consultar,
      COALESCE(ro.Alta, 0) AS Alta,
      COALESCE(ro.Baja, 0) AS Baja,
      COALESCE(ro.Cambio, 0) AS Cambio,
      COALESCE(ro.Imprimir, 0) AS Imprimir,
      COALESCE(ro.Exportar, 0) AS Exportar
    FROM OPCION o
    INNER JOIN MENU m ON o.IdMenu = m.IdMenu
    LEFT JOIN ROLE_OPCION ro ON o.IdOpcion = ro.IdOpcion AND ro.IdRole = ?
    WHERE m.IdModulo = ?
    ORDER BY m.OrdenMenu, o.OrdenMenu ASC
  `;
  const [rows] = await db.query(sql, [idRole, idModulo]);
  return rows;
}

// 2. Guardar/Actualizar permisos desde la pantalla (Bulk Upsert)
async function guardarPermiso(datos) {
  const { IdRole, IdOpcion, Consultar, Alta, Baja, Cambio, Imprimir, Exportar, Usuario } = datos;
  
  // Utiliza INSERT ... ON DUPLICATE KEY UPDATE para insertar si no existe, o actualizar si ya existe.
  const sql = `
    INSERT INTO ROLE_OPCION (IdRole, IdOpcion, Consultar, Alta, Baja, Cambio, Imprimir, Exportar, FechaCreacion, UsuarioCreacion)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
    ON DUPLICATE KEY UPDATE 
      Consultar = VALUES(Consultar), 
      Alta = VALUES(Alta), 
      Baja = VALUES(Baja), 
      Cambio = VALUES(Cambio), 
      Imprimir = VALUES(Imprimir), 
      Exportar = VALUES(Exportar),
      FechaModificacion = NOW(),
      UsuarioModificacion = ?
  `;
  await db.query(sql, [IdRole, IdOpcion, Consultar, Alta, Baja, Cambio, Imprimir, Exportar, Usuario, Usuario]);
}

async function verificarPermiso(idRole, nombreOpcion, tipoPermiso) {
  const sql = `
    SELECT ro.${tipoPermiso} as TienePermiso
    FROM ROLE_OPCION ro
    INNER JOIN OPCION o ON ro.IdOpcion = o.IdOpcion
    WHERE ro.IdRole = ? AND o.Nombre = ?
  `;
  const [rows] = await db.query(sql, [idRole, nombreOpcion]);
  return rows.length > 0 ? rows[0].TienePermiso : 0;
}

// Trae, para el rol indicado, TODAS las opciones del sistema junto con su
// jerarquía completa (Módulo -> Menú -> Opción) y los permisos que el rol
// tiene sobre cada una. Se usa para:
//   1) Armar el menú lateral de 3 niveles en el dashboard (solo se muestran
//      los nodos donde Consultar = 1).
//   2) Alimentar aplicarPermisos()/tienePermiso() en cada pantalla para
//      mostrar/ocultar botones de Alta, Cambio, Baja, Imprimir y Exportar.
async function obtenerPermisosPorRole(idRole) {
  const sql = `
    SELECT 
      mo.IdModulo,
      mo.Nombre AS NombreModulo,
      mo.OrdenMenu AS OrdenModulo,
      m.IdMenu,
      m.Nombre AS NombreMenu,
      m.OrdenMenu AS OrdenMenuEnModulo,
      o.IdOpcion,
      o.Nombre AS Opcion,
      o.Pagina,
      o.OrdenMenu AS OrdenOpcionEnMenu,
      COALESCE(ro.Consultar, 0) AS Consultar,
      COALESCE(ro.Alta, 0) AS Alta,
      COALESCE(ro.Baja, 0) AS Baja,
      COALESCE(ro.Cambio, 0) AS Cambio,
      COALESCE(ro.Imprimir, 0) AS Imprimir,
      COALESCE(ro.Exportar, 0) AS Exportar
    FROM OPCION o
    INNER JOIN MENU m ON o.IdMenu = m.IdMenu
    INNER JOIN MODULO mo ON m.IdModulo = mo.IdModulo
    LEFT JOIN ROLE_OPCION ro ON o.IdOpcion = ro.IdOpcion AND ro.IdRole = ?
    ORDER BY mo.OrdenMenu ASC, m.OrdenMenu ASC, o.OrdenMenu ASC
  `;
  const [rows] = await db.query(sql, [idRole]);
  return rows;
}

module.exports = { obtenerMatrizPermisos, guardarPermiso, verificarPermiso, obtenerPermisosPorRole };