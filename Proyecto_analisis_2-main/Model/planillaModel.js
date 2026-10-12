const { db } = require('../Config/db.js');

const DIAS_BASE_MES = 30; // el descuento por día de inasistencia = sueldo base / 30

function redondear(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }

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

// Resultado ya procesado de un período: cabecera + detalle por empleado.
async function obtenerResultado(anio, mes) {
  const [cab] = await db.query(
    `SELECT Anio, Mes, TotalIngresos, TotalDescuentos, SalarioNeto,
            DATE_FORMAT(FechaHoraProcesada, '%Y-%m-%d %H:%i:%s') AS FechaHoraProcesada, UsuarioCreacion
     FROM PLANILLA_CABECERA WHERE Anio = ? AND Mes = ?`, [anio, mes]);
  if (cab.length === 0) return null;

  const [detalle] = await db.query(
    `SELECT
       d.IdPlanillaDetalle, d.IdEmpleado,
       CONCAT(p.Nombre, ' ', p.Apellido) AS NombreEmpleado,
       DATE_FORMAT(d.FechaContratacion, '%Y-%m-%d') AS FechaContratacion,
       pu.Nombre AS NombrePuesto,
       st.Nombre AS NombreStatus,
       d.IngresoSueldoBase, d.IngresoBonificacionDecreto, d.IngresoOtrosIngresos,
       d.DescuentoIgss, d.DescuentoIsr, d.DescuentoInasistencias, d.SalarioNeto
     FROM PLANILLA_DETALLE d
     INNER JOIN EMPLEADO e ON d.IdEmpleado = e.IdEmpleado
     INNER JOIN PERSONA p ON e.IdPersona = p.IdPersona
     INNER JOIN PUESTO pu ON d.IdPuesto = pu.IdPuesto
     INNER JOIN STATUS_EMPLEADO st ON d.IdStatusEmpleado = st.IdStatusEmpleado
     WHERE d.Anio = ? AND d.Mes = ?
     ORDER BY p.Nombre, p.Apellido`, [anio, mes]);

  return { cabecera: cab[0], detalle };
}

/*
 * Proceso de cálculo de planilla (se ejecuta en una sola transacción).
 *
 * Reglas:
 *  - Se incluyen los empleados con status "Activo" (IdStatusEmpleado = 1) contratados
 *    en o antes de la fecha fin del período.
 *  - Ingresos = Sueldo base + Bonificación decreto + Otros ingresos (de la ficha del empleado).
 *  - Descuentos = IGSS + ISR (de la ficha del empleado) + Inasistencias.
 *  - Inasistencias = días de ausencia que caen dentro del período x (sueldo base / 30),
 *    considerando solo las que aún no han sido procesadas (FechaProcesado IS NULL).
 *    Las inasistencias que terminan dentro del período quedan marcadas con FechaProcesado.
 *  - Salario neto = Ingresos - Descuentos.
 *  - Un período solo se procesa una vez.
 */
async function calcularPlanilla(anio, mes, usuario) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Bloquea el período para evitar dos procesos simultáneos
    const [per] = await conn.query(
      `SELECT Anio, Mes, DATE_FORMAT(FechaInicio, '%Y-%m-%d') AS FechaInicio, DATE_FORMAT(FechaFin, '%Y-%m-%d') AS FechaFin
       FROM PERIODO_PLANILLA WHERE Anio = ? AND Mes = ? FOR UPDATE`, [anio, mes]);
    if (per.length === 0) { const e = new Error('El período seleccionado no existe.'); e.codigoNegocio = 'PERIODO_NO_EXISTE'; throw e; }
    const { FechaInicio, FechaFin } = per[0];

    const [yaExiste] = await conn.query('SELECT 1 FROM PLANILLA_CABECERA WHERE Anio = ? AND Mes = ?', [anio, mes]);
    if (yaExiste.length > 0) { const e = new Error('La planilla de este período ya fue procesada.'); e.codigoNegocio = 'YA_PROCESADA'; throw e; }

    const [empleados] = await conn.query(
      `SELECT IdEmpleado, DATE_FORMAT(FechaContratacion, '%Y-%m-%d') AS FechaContratacion, IdPuesto, IdStatusEmpleado,
              IngresoSueldoBase, IngresoBonificacionDecreto, IngresoOtrosIngresos, DescuentoIgss, DescuentoIsr
       FROM EMPLEADO
       WHERE IdStatusEmpleado = 1 AND FechaContratacion <= ?
       ORDER BY IdEmpleado`, [FechaFin]);
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
      const base = Number(e.IngresoSueldoBase);
      const bono = Number(e.IngresoBonificacionDecreto);
      const otros = Number(e.IngresoOtrosIngresos);
      const igss = Number(e.DescuentoIgss);
      const isr = Number(e.DescuentoIsr);
      const dias = diasPorEmpleado.get(e.IdEmpleado) || 0;
      const inas = redondear(base / DIAS_BASE_MES * dias);
      const ingresos = redondear(base + bono + otros);
      const descuentos = redondear(igss + isr + inas);
      const neto = redondear(ingresos - descuentos);
      totalIngresos += ingresos;
      totalDescuentos += descuentos;
      return { e, inas, neto };
    });
    totalIngresos = redondear(totalIngresos);
    totalDescuentos = redondear(totalDescuentos);
    const totalNeto = redondear(totalIngresos - totalDescuentos);

    await conn.query(
      `INSERT INTO PLANILLA_CABECERA (Anio, Mes, TotalIngresos, TotalDescuentos, SalarioNeto, FechaHoraProcesada, FechaCreacion, UsuarioCreacion)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW(), ?)`,
      [anio, mes, totalIngresos, totalDescuentos, totalNeto, usuario]);

    for (const f of filas) {
      await conn.query(
        `INSERT INTO PLANILLA_DETALLE
           (Anio, Mes, IdEmpleado, FechaContratacion, IdPuesto, IdStatusEmpleado, IngresoSueldoBase,
            IngresoBonificacionDecreto, IngresoOtrosIngresos, DescuentoIgss, DescuentoIsr,
            DescuentoInasistencias, SalarioNeto, FechaCreacion, UsuarioCreacion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
        [anio, mes, f.e.IdEmpleado, f.e.FechaContratacion, f.e.IdPuesto, f.e.IdStatusEmpleado,
         f.e.IngresoSueldoBase, f.e.IngresoBonificacionDecreto, f.e.IngresoOtrosIngresos,
         f.e.DescuentoIgss, f.e.DescuentoIsr, f.inas, f.neto, usuario]);
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

module.exports = { obtenerPeriodos, obtenerResultado, calcularPlanilla };
