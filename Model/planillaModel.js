const { db } = require('../Config/db.js');
const { calcularIsrPorTramo, calcularDescuentoDiario } = require('./empleadoModel.js');

const DIAS_BASE_MES = 30;

function redondear(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }

let migracionPlanillaEjecutada = false;

async function sincronizarIsrPlanillasExistentes() {
  if (migracionPlanillaEjecutada) return;
  migracionPlanillaEjecutada = true;
  try {
    const [chk] = await db.query("SHOW COLUMNS FROM PLANILLA_DETALLE LIKE 'PorcentajeIsr'");
    if (chk.length > 0) {
      await db.query(`
        UPDATE PLANILLA_DETALLE
        SET PorcentajeIsr = CASE WHEN IngresoSueldoBase <= 30000 THEN 5.00 ELSE 7.00 END,
            DescuentoIsr = ROUND(IngresoSueldoBase * (CASE WHEN IngresoSueldoBase <= 30000 THEN 0.05 ELSE 0.07 END), 2),
            SalarioNeto = ROUND((IngresoSueldoBase + IngresoBonificacionDecreto + IngresoOtrosIngresos) - (DescuentoIgss + ROUND(IngresoSueldoBase * (CASE WHEN IngresoSueldoBase <= 30000 THEN 0.05 ELSE 0.07 END), 2) + DescuentoInasistencias), 2)
        WHERE IngresoSueldoBase > 0 AND DescuentoIsr = 0
      `);
    } else {
      await db.query(`
        UPDATE PLANILLA_DETALLE
        SET DescuentoIsr = ROUND(IngresoSueldoBase * (CASE WHEN IngresoSueldoBase <= 30000 THEN 0.05 ELSE 0.07 END), 2),
            SalarioNeto = ROUND((IngresoSueldoBase + IngresoBonificacionDecreto + IngresoOtrosIngresos) - (DescuentoIgss + ROUND(IngresoSueldoBase * (CASE WHEN IngresoSueldoBase <= 30000 THEN 0.05 ELSE 0.07 END), 2) + DescuentoInasistencias), 2)
        WHERE IngresoSueldoBase > 0 AND DescuentoIsr = 0
      `);
    }
    await db.query(`
      UPDATE PLANILLA_CABECERA c
      INNER JOIN (
        SELECT Anio, Mes,
               ROUND(SUM(IngresoSueldoBase + IngresoBonificacionDecreto + IngresoOtrosIngresos), 2) AS SumIngresos,
               ROUND(SUM(DescuentoIgss + DescuentoIsr + DescuentoInasistencias), 2) AS SumDescuentos,
               ROUND(SUM(SalarioNeto), 2) AS SumNeto
        FROM PLANILLA_DETALLE
        GROUP BY Anio, Mes
      ) d ON c.Anio = d.Anio AND c.Mes = d.Mes
      SET c.TotalIngresos = d.SumIngresos,
          c.TotalDescuentos = d.SumDescuentos,
          c.SalarioNeto = d.SumNeto
    `);
  } catch (_) {}
}

function normalizarDetallePlanilla(detalle, cabecera) {
  let sumIngresos = 0;
  let sumDescuentos = 0;
  let sumNeto = 0;

  const filas = (detalle || []).map(d => {
    const base = Number(d.IngresoSueldoBase) || 0;
    const bono = Number(d.IngresoBonificacionDecreto) || 0;
    const otros = Number(d.IngresoOtrosIngresos) || 0;
    const pctIgss = (d.PorcentajeIgss !== undefined && d.PorcentajeIgss !== null && Number(d.PorcentajeIgss) > 0)
      ? Number(d.PorcentajeIgss)
      : 4.83;
    const igss = (d.DescuentoIgss !== undefined && d.DescuentoIgss !== null && Number(d.DescuentoIgss) > 0)
      ? redondear(d.DescuentoIgss)
      : redondear(base * (pctIgss / 100));

    const isrCalc = calcularIsrPorTramo(base);
    const pctIsr = isrCalc.porcentaje;
    const isr = isrCalc.monto;

    const inas = redondear(Number(d.DescuentoInasistencias) || 0);
    const totIng = redondear(base + bono + otros);
    const totDesc = redondear(igss + isr + inas);
    const neto = redondear(totIng - totDesc);

    sumIngresos += totIng;
    sumDescuentos += totDesc;
    sumNeto += neto;

    return {
      ...d,
      PorcentajeIgss: pctIgss,
      DescuentoIgss: igss,
      PorcentajeIsr: pctIsr,
      DescuentoIsr: isr,
      DescuentoInasistencias: inas,
      TotalIngresosEmpleado: totIng,
      TotalDescuentosEmpleado: totDesc,
      SalarioNeto: neto
    };
  });

  const cabNormalizada = cabecera ? {
    ...cabecera,
    TotalIngresos: filas.length > 0 ? redondear(sumIngresos) : redondear(cabecera.TotalIngresos),
    TotalDescuentos: filas.length > 0 ? redondear(sumDescuentos) : redondear(cabecera.TotalDescuentos),
    SalarioNeto: filas.length > 0 ? redondear(sumNeto) : redondear(cabecera.SalarioNeto)
  } : null;

  return { cabecera: cabNormalizada, detalle: filas };
}

async function obtenerPeriodos() {
  const sql = `
    SELECT
      p.Anio, p.Mes,
      DATE_FORMAT(p.FechaInicio, '%Y-%m-%d') AS FechaInicio,
      DATE_FORMAT(p.FechaFin, '%Y-%m-%d') AS FechaFin,
      DATE_FORMAT(c.FechaHoraProcesada, '%Y-%m-%d %H:%i') AS FechaHoraProcesada,
      CASE WHEN c.FechaHoraProcesada IS NULL THEN 0 ELSE 1 END AS Procesado
    FROM PERIODO_PLANILLA p
    LEFT JOIN PLANILLA_CABECERA c ON c.Anio = p.Anio AND c.Mes = p.Mes
    ORDER BY p.Anio, p.Mes`;
  const [rows] = await db.query(sql);
  return rows;
}

async function obtenerResultado(anio, mes) {
  const [cab] = await db.query(
    `SELECT Anio, Mes, TotalIngresos, TotalDescuentos, SalarioNeto,
            DATE_FORMAT(FechaHoraProcesada, '%Y-%m-%d %H:%i:%s') AS FechaHoraProcesada, UsuarioCreacion
     FROM PLANILLA_CABECERA WHERE Anio = ? AND Mes = ?`, [anio, mes]);
  if (cab.length === 0) return null;

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

  const [detalle] = await db.query(
    `SELECT
       d.IdPlanillaDetalle, d.IdEmpleado,
       CONCAT(p.Nombre, ' ', p.Apellido) AS NombreEmpleado,
       DATE_FORMAT(d.FechaContratacion, '%Y-%m-%d') AS FechaContratacion,
       pu.Nombre AS NombrePuesto,
       st.Nombre AS NombreStatus,
       d.IngresoSueldoBase, d.IngresoBonificacionDecreto, d.IngresoOtrosIngresos,
       ${camposPorcentaje}
       d.DescuentoIgss, d.DescuentoIsr, d.DescuentoInasistencias, d.SalarioNeto
     FROM PLANILLA_DETALLE d
     INNER JOIN EMPLEADO e ON d.IdEmpleado = e.IdEmpleado
     INNER JOIN PERSONA p ON e.IdPersona = p.IdPersona
     INNER JOIN PUESTO pu ON d.IdPuesto = pu.IdPuesto
     INNER JOIN STATUS_EMPLEADO st ON d.IdStatusEmpleado = st.IdStatusEmpleado
     WHERE d.Anio = ? AND d.Mes = ?
     ORDER BY d.IdEmpleado ASC`, [anio, mes]);

  return normalizarDetallePlanilla(detalle, cab[0]);
}

async function calcularPlanilla(anio, mes, usuario) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [per] = await conn.query(
      `SELECT Anio, Mes, DATE_FORMAT(FechaInicio, '%Y-%m-%d') AS FechaInicio, DATE_FORMAT(FechaFin, '%Y-%m-%d') AS FechaFin
       FROM PERIODO_PLANILLA WHERE Anio = ? AND Mes = ? FOR UPDATE`, [anio, mes]);
    if (per.length === 0) { const e = new Error('El período seleccionado no existe.'); e.codigoNegocio = 'PERIODO_NO_EXISTE'; throw e; }
    const { FechaInicio, FechaFin } = per[0];

    const [yaExiste] = await conn.query('SELECT 1 FROM PLANILLA_CABECERA WHERE Anio = ? AND Mes = ?', [anio, mes]);
    if (yaExiste.length > 0) { const e = new Error('La planilla de este período ya fue procesada.'); e.codigoNegocio = 'YA_PROCESADA'; throw e; }

    let tieneColsEmp = false;
    try {
      const [chkEmp] = await conn.query("SHOW COLUMNS FROM EMPLEADO LIKE 'PorcentajeIgss'");
      tieneColsEmp = chkEmp.length > 0;
    } catch (err) {
      tieneColsEmp = false;
    }

    const selectEmpSql = tieneColsEmp
      ? `SELECT IdEmpleado, DATE_FORMAT(FechaContratacion, '%Y-%m-%d') AS FechaContratacion, IdPuesto, IdStatusEmpleado,
                IngresoSueldoBase, IngresoBonificacionDecreto, IngresoOtrosIngresos,
                COALESCE(PorcentajeIgss, 4.83) AS PorcentajeIgss,
                DescuentoIgss, DescuentoIsr, DescuentoInasistencias
         FROM EMPLEADO
         WHERE IdStatusEmpleado = 1 AND FechaContratacion <= ?
         ORDER BY IdEmpleado`
      : `SELECT IdEmpleado, DATE_FORMAT(FechaContratacion, '%Y-%m-%d') AS FechaContratacion, IdPuesto, IdStatusEmpleado,
                IngresoSueldoBase, IngresoBonificacionDecreto, IngresoOtrosIngresos,
                4.83 AS PorcentajeIgss,
                DescuentoIgss, DescuentoIsr, DescuentoInasistencias
         FROM EMPLEADO
         WHERE IdStatusEmpleado = 1 AND FechaContratacion <= ?
         ORDER BY IdEmpleado`;

    const [empleados] = await conn.query(selectEmpSql, [FechaFin]);
    if (empleados.length === 0) { const e = new Error('No hay empleados activos para procesar en este período.'); e.codigoNegocio = 'SIN_EMPLEADOS'; throw e; }

    const [inasist] = await conn.query(
      `SELECT i.IdInasistencia, i.IdEmpleado,
              DATEDIFF(LEAST(DATE(i.FechaFinal), ?), GREATEST(DATE(i.FechaInicial), ?)) + 1 AS Dias,
              DATE_FORMAT(i.FechaFinal, '%Y-%m-%d') AS FechaFinal
       FROM INASISTENCIA i
       INNER JOIN EMPLEADO e ON e.IdEmpleado = i.IdEmpleado AND e.IdStatusEmpleado = 1
       WHERE i.FechaProcesado IS NULL AND DATE(i.FechaInicial) <= ? AND DATE(i.FechaFinal) >= ?
       FOR UPDATE`, [FechaFin, FechaInicio, FechaFin, FechaInicio]);

    const diasPorEmpleado = new Map();
    const idsAProcesar = [];
    inasist.forEach(i => {
      diasPorEmpleado.set(i.IdEmpleado, (diasPorEmpleado.get(i.IdEmpleado) || 0) + Number(i.Dias));
      if (i.FechaFinal <= FechaFin) idsAProcesar.push(i.IdInasistencia);
    });

    let totalIngresos = 0, totalDescuentos = 0;
    const filas = empleados.map(e => {
      const base = Number(e.IngresoSueldoBase) || 0;
      const bono = Number(e.IngresoBonificacionDecreto) || 0;
      const otros = Number(e.IngresoOtrosIngresos) || 0;

      const pctIgss = (e.PorcentajeIgss !== null && e.PorcentajeIgss !== undefined && e.PorcentajeIgss !== '')
        ? Number(e.PorcentajeIgss)
        : 4.83;

      const isrInfo = calcularIsrPorTramo(base);
      const pctIsr = isrInfo.porcentaje;
      const igss = redondear(base * (pctIgss / 100));
      const isr = isrInfo.monto;

      const dias = diasPorEmpleado.get(e.IdEmpleado) || 0;
      const descuentoDiario = calcularDescuentoDiario(base);
      const inas = dias > 0 ? redondear(descuentoDiario * dias) : 0;

      const ingresos = redondear(base + bono + otros);
      const descuentos = redondear(igss + isr + inas);
      const neto = redondear(ingresos - descuentos);

      totalIngresos += ingresos;
      totalDescuentos += descuentos;
      return { e, pctIgss, pctIsr, igss, isr, inas, neto };
    });

    totalIngresos = redondear(totalIngresos);
    totalDescuentos = redondear(totalDescuentos);
    const totalNeto = redondear(totalIngresos - totalDescuentos);

    await conn.query(
      `INSERT INTO PLANILLA_CABECERA (Anio, Mes, TotalIngresos, TotalDescuentos, SalarioNeto, FechaHoraProcesada, FechaCreacion, UsuarioCreacion)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW(), ?)`,
      [anio, mes, totalIngresos, totalDescuentos, totalNeto, usuario]);

    let tieneColsDetalle = false;
    try {
      const [chkDet] = await conn.query("SHOW COLUMNS FROM PLANILLA_DETALLE LIKE 'PorcentajeIgss'");
      tieneColsDetalle = chkDet.length > 0;
    } catch (err) {
      tieneColsDetalle = false;
    }

    for (const f of filas) {
      if (tieneColsDetalle) {
        await conn.query(
          `INSERT INTO PLANILLA_DETALLE
             (Anio, Mes, IdEmpleado, FechaContratacion, IdPuesto, IdStatusEmpleado, IngresoSueldoBase,
              IngresoBonificacionDecreto, IngresoOtrosIngresos, PorcentajeIgss, DescuentoIgss,
              PorcentajeIsr, DescuentoIsr, DescuentoInasistencias, SalarioNeto, FechaCreacion, UsuarioCreacion)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
          [anio, mes, f.e.IdEmpleado, f.e.FechaContratacion, f.e.IdPuesto, f.e.IdStatusEmpleado,
           f.e.IngresoSueldoBase, f.e.IngresoBonificacionDecreto, f.e.IngresoOtrosIngresos,
           f.pctIgss, f.igss, f.pctIsr, f.isr, f.inas, f.neto, usuario]);
      } else {
        await conn.query(
          `INSERT INTO PLANILLA_DETALLE
             (Anio, Mes, IdEmpleado, FechaContratacion, IdPuesto, IdStatusEmpleado, IngresoSueldoBase,
              IngresoBonificacionDecreto, IngresoOtrosIngresos, DescuentoIgss, DescuentoIsr,
              DescuentoInasistencias, SalarioNeto, FechaCreacion, UsuarioCreacion)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
          [anio, mes, f.e.IdEmpleado, f.e.FechaContratacion, f.e.IdPuesto, f.e.IdStatusEmpleado,
           f.e.IngresoSueldoBase, f.e.IngresoBonificacionDecreto, f.e.IngresoOtrosIngresos,
           f.igss, f.isr, f.inas, f.neto, usuario]);
      }
    }

    if (idsAProcesar.length > 0) {
      await conn.query(
        'UPDATE INASISTENCIA SET FechaProcesado = NOW(), FechaModificacion = NOW(), UsuarioModificacion = ? WHERE IdInasistencia IN (?)',
        [usuario, idsAProcesar]);
    }

    await conn.commit();
    return { empleados: filas.length, inasistenciasProcesadas: idsAProcesar.length, totalIngresos, totalDescuentos, totalNeto };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = {
  obtenerPeriodos,
  obtenerResultado,
  calcularPlanilla,
  normalizarDetallePlanilla,
  sincronizarIsrPlanillasExistentes
};
