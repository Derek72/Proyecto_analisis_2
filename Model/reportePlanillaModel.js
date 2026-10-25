const { db } = require('../Config/db.js');
const { normalizarDetallePlanilla, sincronizarIsrPlanillasExistentes } = require('./planillaModel.js');

async function obtenerPeriodosProcesados() {
  await sincronizarIsrPlanillasExistentes();
  const sql = `
    SELECT 
      p.Anio, 
      p.Mes,
      DATE_FORMAT(p.FechaInicio, '%Y-%m-%d') AS FechaInicio,
      DATE_FORMAT(p.FechaFin, '%Y-%m-%d') AS FechaFin,
      DATE_FORMAT(c.FechaHoraProcesada, '%Y-%m-%d %H:%i') AS FechaHoraProcesada,
      CASE WHEN c.FechaHoraProcesada IS NULL THEN 0 ELSE 1 END AS Procesado,
      c.TotalIngresos,
      c.TotalDescuentos,
      c.SalarioNeto
    FROM PERIODO_PLANILLA p
    LEFT JOIN PLANILLA_CABECERA c ON c.Anio = p.Anio AND c.Mes = p.Mes
    ORDER BY p.Anio ASC, p.Mes ASC`;
  const [rows] = await db.query(sql);
  return rows;
}

async function obtenerReportePorPeriodo(anio, mes) {
  await sincronizarIsrPlanillasExistentes();
  const [cabecera] = await db.query(
    `SELECT Anio, Mes, TotalIngresos, TotalDescuentos, SalarioNeto,
            DATE_FORMAT(FechaHoraProcesada, '%Y-%m-%d %H:%i:%s') AS FechaHoraProcesada,
            UsuarioCreacion
     FROM PLANILLA_CABECERA 
     WHERE Anio = ? AND Mes = ?`, 
    [anio, mes]
  );

  if (cabecera.length === 0) return null;

  let tieneColsDetalle = false;
  try {
    const [chk] = await db.query("SHOW COLUMNS FROM PLANILLA_DETALLE LIKE 'PorcentajeIgss'");
    tieneColsDetalle = chk.length > 0;
  } catch (err) {
    tieneColsDetalle = false;
  }

  const camposPorcentaje = tieneColsDetalle
    ? `COALESCE(d.PorcentajeIgss, 4.83) AS PorcentajeIgss,
       CASE WHEN d.IngresoSueldoBase <= 30000 THEN 5.00 ELSE 7.00 END AS PorcentajeIsr,`
    : `CASE WHEN d.IngresoSueldoBase > 0 AND d.DescuentoIgss > 0 THEN ROUND((d.DescuentoIgss / d.IngresoSueldoBase) * 100, 2) ELSE 4.83 END AS PorcentajeIgss,
       CASE WHEN d.IngresoSueldoBase <= 30000 THEN 5.00 ELSE 7.00 END AS PorcentajeIsr,`;

  const sqlDetalle = `
    SELECT 
      d.IdPlanillaDetalle,
      d.IdEmpleado,
      CONCAT(p.Nombre, ' ', p.Apellido) AS NombreEmpleado,
      DATE_FORMAT(d.FechaContratacion, '%Y-%m-%d') AS FechaContratacion,
      pu.Nombre AS NombrePuesto,
      st.Nombre AS NombreStatus,
      d.IngresoSueldoBase,
      d.IngresoBonificacionDecreto,
      d.IngresoOtrosIngresos,
      (d.IngresoSueldoBase + d.IngresoBonificacionDecreto + d.IngresoOtrosIngresos) AS TotalIngresosEmpleado,
      ${camposPorcentaje}
      d.DescuentoIgss,
      d.DescuentoIsr,
      d.DescuentoInasistencias,
      (d.DescuentoIgss + d.DescuentoIsr + d.DescuentoInasistencias) AS TotalDescuentosEmpleado,
      d.SalarioNeto
    FROM PLANILLA_DETALLE d
    INNER JOIN EMPLEADO e ON d.IdEmpleado = e.IdEmpleado
    INNER JOIN PERSONA p ON e.IdPersona = p.IdPersona
    INNER JOIN PUESTO pu ON d.IdPuesto = pu.IdPuesto
    INNER JOIN STATUS_EMPLEADO st ON d.IdStatusEmpleado = st.IdStatusEmpleado
    WHERE d.Anio = ? AND d.Mes = ?
    ORDER BY d.IdEmpleado ASC`;

  const [detalle] = await db.query(sqlDetalle, [anio, mes]);

  return normalizarDetallePlanilla(detalle, cabecera[0]);
}

module.exports = { obtenerPeriodosProcesados, obtenerReportePorPeriodo };
