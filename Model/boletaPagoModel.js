const { db } = require('../Config/db.js');
const { calcularIsrPorTramo } = require('./empleadoModel.js');

function redondear(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

let columnaDocumentoCache = null;

async function obtenerColumnaDocumento() {
  if (columnaDocumentoCache) return columnaDocumentoCache;
  try {
    const [rows] = await db.query('SHOW COLUMNS FROM DOCUMENTO_PERSONA');
    const cols = rows.map(r => r.Field);
    if (cols.includes('NoDocumento')) {
      columnaDocumentoCache = 'NoDocumento';
    } else if (cols.includes('NumeroDocumento')) {
      columnaDocumentoCache = 'NumeroDocumento';
    } else {
      columnaDocumentoCache = 'NoDocumento';
    }
  } catch (_) {
    columnaDocumentoCache = 'NoDocumento';
  }
  return columnaDocumentoCache;
}

async function obtenerPeriodosBoletas() {
  const sql = `
    SELECT 
      p.Anio, 
      p.Mes,
      DATE_FORMAT(p.FechaInicio, '%Y-%m-%d') AS FechaInicio,
      DATE_FORMAT(p.FechaFin, '%Y-%m-%d') AS FechaFin,
      DATE_FORMAT(c.FechaHoraProcesada, '%Y-%m-%d %H:%i') AS FechaHoraProcesada,
      CASE WHEN c.FechaHoraProcesada IS NULL THEN 0 ELSE 1 END AS Procesado
    FROM PERIODO_PLANILLA p
    LEFT JOIN PLANILLA_CABECERA c ON c.Anio = p.Anio AND c.Mes = p.Mes
    ORDER BY p.Anio ASC, p.Mes ASC`;
  const [rows] = await db.query(sql);
  return rows;
}

async function obtenerEmpleadosPorPeriodo(anio, mes) {
  const sql = `
    SELECT 
      d.IdEmpleado, 
      CONCAT(p.Nombre, ' ', p.Apellido) AS NombreEmpleado,
      pu.Nombre AS NombrePuesto
    FROM PLANILLA_DETALLE d
    INNER JOIN EMPLEADO e ON d.IdEmpleado = e.IdEmpleado
    INNER JOIN PERSONA p ON e.IdPersona = p.IdPersona
    INNER JOIN PUESTO pu ON d.IdPuesto = pu.IdPuesto
    WHERE d.Anio = ? AND d.Mes = ?
    ORDER BY d.IdEmpleado ASC`;
  const [rows] = await db.query(sql, [anio, mes]);
  return rows;
}

async function obtenerBoletaEmpleado(anio, mes, idEmpleado) {
  let tieneColsDetalle = false;
  try {
    const [chk] = await db.query("SHOW COLUMNS FROM PLANILLA_DETALLE LIKE 'PorcentajeIgss'");
    tieneColsDetalle = chk.length > 0;
  } catch (_) {
    tieneColsDetalle = false;
  }

  const camposPorcentaje = tieneColsDetalle
    ? `COALESCE(d.PorcentajeIgss, 4.83) AS PorcentajeIgss,
       CASE WHEN d.IngresoSueldoBase <= 30000 THEN 5.00 ELSE 7.00 END AS PorcentajeIsr,`
    : `CASE WHEN d.IngresoSueldoBase > 0 AND d.DescuentoIgss > 0 THEN ROUND((d.DescuentoIgss / d.IngresoSueldoBase) * 100, 2) ELSE 4.83 END AS PorcentajeIgss,
       CASE WHEN d.IngresoSueldoBase <= 30000 THEN 5.00 ELSE 7.00 END AS PorcentajeIsr,`;

  const colDoc = await obtenerColumnaDocumento();

  const sql = `
    SELECT 
      d.Anio,
      d.Mes,
      d.IdEmpleado,
      CONCAT(p.Nombre, ' ', p.Apellido) AS NombreEmpleado,
      COALESCE(
        (SELECT dp.${colDoc} FROM DOCUMENTO_PERSONA dp WHERE dp.IdPersona = p.IdPersona LIMIT 1),
        'N/D'
      ) AS NumeroIdentificacion,
      DATE_FORMAT(d.FechaContratacion, '%Y-%m-%d') AS FechaContratacion,
      COALESCE(pu.Nombre, 'Puesto Asignado') AS NombrePuesto,
      COALESCE(dep.Nombre, 'General') AS NombreDepartamento,
      COALESCE(suc.Nombre, 'Central') AS NombreSucursal,
      COALESCE(emp.Nombre, 'EMPRESA PRINCIPAL') AS NombreEmpresa,
      COALESCE(emp.Nit, 'C/F') AS NitEmpresa,
      cb.NumeroDeCuenta,
      ban.Nombre AS NombreBanco,
      d.IngresoSueldoBase,
      d.IngresoBonificacionDecreto,
      d.IngresoOtrosIngresos,
      ${camposPorcentaje}
      d.DescuentoIgss,
      d.DescuentoIsr,
      d.DescuentoInasistencias,
      d.SalarioNeto,
      DATE_FORMAT(per.FechaInicio, '%Y-%m-%d') AS FechaInicioPeriodo,
      DATE_FORMAT(per.FechaFin, '%Y-%m-%d') AS FechaFinPeriodo,
      DATE_FORMAT(c.FechaHoraProcesada, '%Y-%m-%d %H:%i') AS FechaHoraProcesada
    FROM PLANILLA_DETALLE d
    INNER JOIN PLANILLA_CABECERA c ON d.Anio = c.Anio AND d.Mes = c.Mes
    INNER JOIN PERIODO_PLANILLA per ON d.Anio = per.Anio AND d.Mes = per.Mes
    INNER JOIN EMPLEADO e ON d.IdEmpleado = e.IdEmpleado
    INNER JOIN PERSONA p ON e.IdPersona = p.IdPersona
    LEFT JOIN PUESTO pu ON d.IdPuesto = pu.IdPuesto
    LEFT JOIN DEPARTAMENTO dep ON pu.IdDepartamento = dep.IdDepartamento
    LEFT JOIN SUCURSAL suc ON e.IdSucursal = suc.IdSucursal
    LEFT JOIN EMPRESA emp ON suc.IdEmpresa = emp.IdEmpresa
    LEFT JOIN CUENTA_BANCARIA_EMPLEADO cb ON e.IdEmpleado = cb.IdEmpleado AND cb.Activa = 1
    LEFT JOIN BANCO ban ON cb.IdBanco = ban.IdBanco
    WHERE d.Anio = ? AND d.Mes = ? AND d.IdEmpleado = ?
    LIMIT 1`;

  const [rows] = await db.query(sql, [anio, mes, idEmpleado]);
  if (!rows[0]) return null;

  const b = rows[0];
  const base = Number(b.IngresoSueldoBase) || 0;
  const bono = Number(b.IngresoBonificacionDecreto) || 0;
  const otros = Number(b.IngresoOtrosIngresos) || 0;
  const pctIgss = Number(b.PorcentajeIgss ?? 4.83);
  const igss = redondear(b.DescuentoIgss);
  const pctIsr = calcularIsrPorTramo(base).porcentaje;
  const isr = redondear(b.DescuentoIsr);
  const inas = redondear(Number(b.DescuentoInasistencias) || 0);

  const totIng = redondear(base + bono + otros);
  const totDesc = redondear(igss + isr + inas);
  const neto = redondear(b.SalarioNeto);

  return {
    ...b,
    PorcentajeIgss: pctIgss,
    DescuentoIgss: igss,
    PorcentajeIsr: pctIsr,
    DescuentoIsr: isr,
    DescuentoInasistencias: inas,
    TotalIngresos: totIng,
    TotalDescuentos: totDesc,
    SalarioNeto: neto
  };
}

module.exports = {
  obtenerPeriodosBoletas,
  obtenerEmpleadosPorPeriodo,
  obtenerBoletaEmpleado
};
