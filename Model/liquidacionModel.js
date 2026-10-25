const { db } = require('../Config/db.js');
const { calcularIsrPorTramo, calcularDescuentoDiario } = require('./empleadoModel.js');

function redondear(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function normalizarFechaIso(valor) {
  if (!valor) return '';
  const str = String(valor).trim();
  const matchEsp = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (matchEsp) {
    const d = matchEsp[1].padStart(2, '0');
    const m = matchEsp[2].padStart(2, '0');
    const y = matchEsp[3];
    return `${y}-${m}-${d}`;
  }
  const matchIso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (matchIso) {
    const y = matchIso[1];
    const m = matchIso[2].padStart(2, '0');
    const d = matchIso[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return str;
}

function formatearFechaIsoAEsp(valor) {
  if (!valor) return '';
  const iso = normalizarFechaIso(valor);
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    return `${m[3]}/${m[2]}/${m[1]}`;
  }
  return valor;
}

function parsearFechaSegura(valor) {
  const iso = normalizarFechaIso(valor);
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0);
  }
  return new Date(valor);
}

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

async function obtenerUltimoPeriodoPlanillaEmpleado(idEmpleado, conn = db) {
  const sql = `
    SELECT
      d.Anio,
      d.Mes,
      COALESCE(
        DATE_FORMAT(p.FechaFin, '%Y-%m-%d'),
        DATE_FORMAT(LAST_DAY(STR_TO_DATE(CONCAT(d.Anio, '-', LPAD(d.Mes, 2, '0'), '-01'), '%Y-%m-%d')), '%Y-%m-%d')
      ) AS FechaFinPeriodo,
      DATE_FORMAT(c.FechaHoraProcesada, '%Y-%m-%d %H:%i') AS FechaHoraProcesada
    FROM PLANILLA_DETALLE d
    INNER JOIN PLANILLA_CABECERA c ON c.Anio = d.Anio AND c.Mes = d.Mes
    LEFT JOIN PERIODO_PLANILLA p ON p.Anio = d.Anio AND p.Mes = d.Mes
    WHERE d.IdEmpleado = ?
    ORDER BY d.Anio DESC, d.Mes DESC
    LIMIT 1
  `;
  const [rows] = await conn.query(sql, [idEmpleado]);
  return rows[0] || null;
}

function validarFechasLiquidacion({ fechaContratacion, fechaEgreso, ultimoPeriodo }) {
  const fContra = normalizarFechaIso(fechaContratacion);
  const fEgre = normalizarFechaIso(fechaEgreso);

  if (!fContra || !fEgre) {
    return 'La fecha de contratación y la fecha de egreso son obligatorias.';
  }

  if (fEgre <= fContra) {
    return `La fecha de egreso (${formatearFechaIsoAEsp(fEgre)}) debe ser estrictamente posterior a la fecha de contratación (${formatearFechaIsoAEsp(fContra)}).`;
  }

  if (ultimoPeriodo && ultimoPeriodo.FechaFinPeriodo) {
    const fFinPeriodo = normalizarFechaIso(ultimoPeriodo.FechaFinPeriodo);
    if (fEgre <= fFinPeriodo) {
      const nombreMes = MESES[ultimoPeriodo.Mes] || `Mes ${ultimoPeriodo.Mes}`;
      return `La fecha de egreso (${formatearFechaIsoAEsp(fEgre)}) debe ser posterior al último período de planilla calculado del empleado (${nombreMes} ${ultimoPeriodo.Anio}, finalizado el ${formatearFechaIsoAEsp(fFinPeriodo)}).`;
    }
  }

  return null;
}

function calcularDescuentoPorInasistencia({
  sueldoBase,
  diasFaltados,
  diasBaseMes = 30
}) {
  const base = Number(sueldoBase) || 0;
  const dias = Math.max(0, Number(diasFaltados) || 0);
  const salarioDiario = base > 0 ? redondear(base / diasBaseMes) : 0;
  const descuentoTotal = dias > 0 ? redondear(salarioDiario * dias) : 0;

  return {
    salarioDiario,
    diasFaltados: dias,
    descuentoPorDia: salarioDiario,
    descuentoTotal
  };
}

function calcularPrestacionesLaborales({
  fechaContratacion,
  fechaEgreso,
  sueldoBase,
  bonificacion,
  otrosIngresos,
  descuentoIgss,
  descuentoIsr,
  diasFaltados,
  diasInasistencia,
  descuentoInasistencias,
  motivoEgreso
}) {
  const fInicio = parsearFechaSegura(fechaContratacion);
  const fFin = parsearFechaSegura(fechaEgreso);
  const diffTime = Math.max(0, fFin - fInicio);
  const diasTotalesTrabajados = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const base = Number(sueldoBase) || 0;
  const bono = Number(bonificacion) || 0;
  const otros = Number(otrosIngresos) || 0;

  let montoIndemnizacion = 0;
  if (motivoEgreso === 'Despido Injustificado') {
    const salarioDevengadoPromedio = base + (base / 12) + (base / 12);
    montoIndemnizacion = redondear((salarioDevengadoPromedio * diasTotalesTrabajados) / 365);
  }

  const anioEgreso = fFin.getFullYear();
  let inicioAguinaldo = new Date(anioEgreso - 1, 11, 1, 12, 0, 0);
  if (fFin < inicioAguinaldo) {
    inicioAguinaldo = new Date(anioEgreso - 2, 11, 1, 12, 0, 0);
  }
  const fCalculoAguinaldo = fInicio > inicioAguinaldo ? fInicio : inicioAguinaldo;
  const diasAguinaldo = Math.max(0, Math.round((fFin - fCalculoAguinaldo) / (1000 * 60 * 60 * 24)) + 1);
  const montoAguinaldo = redondear((base * diasAguinaldo) / 365);

  let inicioBono14 = new Date(anioEgreso, 6, 1, 12, 0, 0);
  if (fFin < inicioBono14) {
    inicioBono14 = new Date(anioEgreso - 1, 6, 1, 12, 0, 0);
  }
  const fCalculoBono14 = fInicio > inicioBono14 ? fInicio : inicioBono14;
  const diasBono14 = Math.max(0, Math.round((fFin - fCalculoBono14) / (1000 * 60 * 60 * 24)) + 1);
  const montoBono14 = redondear((base * diasBono14) / 365);

  const diasVacaciones = Math.max(0, (diasTotalesTrabajados % 365));
  const montoVacaciones = redondear(((base / 30) * 15 * diasVacaciones) / 365);

  const diasAusencia = (diasFaltados !== undefined && diasFaltados !== null && diasFaltados !== '')
    ? Number(diasFaltados)
    : ((diasInasistencia !== undefined && diasInasistencia !== null && diasInasistencia !== '')
        ? Number(diasInasistencia)
        : null);

  const detalleInasistencia = calcularDescuentoPorInasistencia({
    sueldoBase: base,
    diasFaltados: diasAusencia !== null ? diasAusencia : 0
  });

  const montoDescuentoInasistencias = detalleInasistencia.descuentoTotal;

  const totalIngresosOrdinarios = redondear(base + bono + otros);

  const isrCalc = calcularIsrPorTramo(base);
  const isrFinal = isrCalc.monto;

  const igssFinal = redondear(Number(descuentoIgss || 0));

  const totalDescuentos = redondear(igssFinal + isrFinal + montoDescuentoInasistencias);
  const salarioNetoPendiente = redondear(totalIngresosOrdinarios - totalDescuentos);

  const totalPrestaciones = redondear(montoIndemnizacion + montoAguinaldo + montoBono14 + montoVacaciones);
  const totalNetoLiquidacion = redondear(salarioNetoPendiente + totalPrestaciones);

  return {
    diasTotalesTrabajados,
    salarioDiario: detalleInasistencia.salarioDiario,
    descuentoDiario: detalleInasistencia.salarioDiario,
    diasFaltados: detalleInasistencia.diasFaltados,
    diasInasistencia: detalleInasistencia.diasFaltados,
    descuentoPorDiaInasistencia: detalleInasistencia.descuentoPorDia,
    descuentoInasistencias: montoDescuentoInasistencias,
    montoIndemnizacion,
    montoAguinaldoProporcional: montoAguinaldo,
    montoBono14Proporcional: montoBono14,
    montoVacacionesProporcionales: montoVacaciones,
    totalIngresos: redondear(totalIngresosOrdinarios + totalPrestaciones),
    totalDescuentos,
    salarioNetoPendiente,
    totalNetoLiquidacion
  };
}

async function registrarLiquidacionTransaccional(data, usuario) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [empRows] = await conn.query(
      `SELECT IdEmpleado, IdPuesto, DATE_FORMAT(FechaContratacion, '%Y-%m-%d') AS FechaContratacion,
              IdStatusEmpleado, IngresoSueldoBase, IngresoBonificacionDecreto, IngresoOtrosIngresos,
              DescuentoIgss, DescuentoIsr
       FROM EMPLEADO
       WHERE IdEmpleado = ?
       FOR UPDATE`,
      [data.IdEmpleado]
    );

    if (!empRows.length) {
      throw new Error('Empleado no encontrado.');
    }

    const empOriginal = empRows[0];
    if (empOriginal.IdStatusEmpleado !== 1) {
      throw new Error('No es posible continuar con la liquidación: El empleado no se encuentra activo.');
    }

    const fechaContratacionFinal = normalizarFechaIso(empOriginal.FechaContratacion || data.FechaContratacion);
    const fechaEgresoFinal = normalizarFechaIso(data.FechaEgreso);
    const fechaLiquidacionFinal = normalizarFechaIso(data.FechaLiquidacion);

    const ultimoPeriodo = await obtenerUltimoPeriodoPlanillaEmpleado(data.IdEmpleado, conn);
    const errorFechas = validarFechasLiquidacion({
      fechaContratacion: fechaContratacionFinal,
      fechaEgreso: fechaEgresoFinal,
      ultimoPeriodo
    });

    if (errorFechas) {
      throw new Error(errorFechas);
    }

    const idPuestoFinal = empOriginal.IdPuesto;
    const sueldoBaseFinal = Number(empOriginal.IngresoSueldoBase) || 0;
    const bonificacionFinal = Number(empOriginal.IngresoBonificacionDecreto) || 0;
    const otrosIngresosFinal = Number(empOriginal.IngresoOtrosIngresos) || 0;
    const igssFinal = Number(empOriginal.DescuentoIgss) || 0;

    const isrCalc = calcularIsrPorTramo(sueldoBaseFinal);
    const isrFinal = isrCalc.monto;

    const diasAusencia = Math.max(0, Number(data.DiasFaltados ?? data.DiasInasistencia ?? 0));
    const descDiario = calcularDescuentoDiario(sueldoBaseFinal);
    const descInasCalculado = diasAusencia > 0 ? redondear(descDiario * diasAusencia) : 0;

    const calculos = calcularPrestacionesLaborales({
      fechaContratacion: fechaContratacionFinal,
      fechaEgreso: fechaEgresoFinal,
      sueldoBase: sueldoBaseFinal,
      bonificacion: bonificacionFinal,
      otrosIngresos: otrosIngresosFinal,
      descuentoIgss: igssFinal,
      descuentoIsr: isrFinal,
      diasFaltados: diasAusencia,
      descuentoInasistencias: descInasCalculado,
      motivoEgreso: data.MotivoEgreso
    });

    const sqlLiq = `
      INSERT INTO LIQUIDACION (
        IdEmpleado, FechaContratacion, FechaEgreso, FechaLiquidacion, MotivoEgreso, IdPuesto,
        IngresoSueldoBase, IngresoBonificacionDecreto, IngresoOtrosIngresos,
        DescuentoIgss, DescuentoIsr, DescuentoInasistencias,
        SalarioNeto, TotalIngresos, TotalDescuentos, TotalNeto,
        FechaCreacion, UsuarioCreacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`;

    const [resLiq] = await conn.query(sqlLiq, [
      data.IdEmpleado, fechaContratacionFinal, fechaEgresoFinal, fechaLiquidacionFinal,
      data.MotivoEgreso, idPuestoFinal, sueldoBaseFinal, bonificacionFinal,
      otrosIngresosFinal, igssFinal, isrFinal, calculos.descuentoInasistencias,
      calculos.salarioNetoPendiente, calculos.totalIngresos, calculos.totalDescuentos, calculos.totalNetoLiquidacion,
      usuario
    ]);

    const motivoLower = (data.MotivoEgreso || '').toLowerCase();
    const esDespido = motivoLower.includes('despid') || motivoLower.includes('despido');
    const nuevoStatus = esDespido ? 5 : 4;

    await conn.query(
      `UPDATE EMPLEADO 
       SET IdStatusEmpleado = ?, FechaModificacion = NOW(), UsuarioModificacion = ? 
       WHERE IdEmpleado = ?`,
      [nuevoStatus, usuario, data.IdEmpleado]
    );

    await conn.commit();
    return { id: resLiq.insertId, ...calculos };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function actualizarLiquidacion(id, data, usuario) {
  const [filas] = await db.query(
    `SELECT IdLiquidacion, IdEmpleado, IdPuesto,
            DATE_FORMAT(FechaContratacion, '%Y-%m-%d') AS FechaContratacion,
            IngresoSueldoBase, IngresoBonificacionDecreto, IngresoOtrosIngresos, DescuentoIgss
     FROM LIQUIDACION WHERE IdLiquidacion = ?`, [id]);
  if (!filas.length) {
    throw new Error('Liquidación no encontrada.');
  }
  const original = filas[0];

  const fechaContratacionFinal = normalizarFechaIso(original.FechaContratacion);
  const fechaEgresoFinal = normalizarFechaIso(data.FechaEgreso);
  const fechaLiquidacionFinal = normalizarFechaIso(data.FechaLiquidacion);

  const ultimoPeriodo = await obtenerUltimoPeriodoPlanillaEmpleado(original.IdEmpleado);
  const errorFechas = validarFechasLiquidacion({
    fechaContratacion: fechaContratacionFinal,
    fechaEgreso: fechaEgresoFinal,
    ultimoPeriodo
  });

  if (errorFechas) {
    throw new Error(errorFechas);
  }

  const base = Number(original.IngresoSueldoBase) || 0;
  const bono = Number(original.IngresoBonificacionDecreto) || 0;
  const otros = Number(original.IngresoOtrosIngresos) || 0;
  const igss = Number(original.DescuentoIgss) || 0;
  const isrFinal = calcularIsrPorTramo(base).monto;

  const diasAusencia = (data.DiasFaltados !== undefined && data.DiasFaltados !== null && data.DiasFaltados !== '')
    ? Math.max(0, Number(data.DiasFaltados))
    : Math.max(0, Number(data.DiasInasistencia) || 0);

  const calculos = calcularPrestacionesLaborales({
    fechaContratacion: fechaContratacionFinal,
    fechaEgreso: fechaEgresoFinal,
    sueldoBase: base,
    bonificacion: bono,
    otrosIngresos: otros,
    descuentoIgss: igss,
    descuentoIsr: isrFinal,
    diasFaltados: diasAusencia,
    motivoEgreso: data.MotivoEgreso
  });

  const sql = `
    UPDATE LIQUIDACION SET
      FechaEgreso = ?, FechaLiquidacion = ?, MotivoEgreso = ?,
      DescuentoIsr = ?, DescuentoInasistencias = ?,
      SalarioNeto = ?, TotalIngresos = ?, TotalDescuentos = ?, TotalNeto = ?
    WHERE IdLiquidacion = ?`;

  await db.query(sql, [
    fechaEgresoFinal, fechaLiquidacionFinal, data.MotivoEgreso,
    isrFinal, calculos.descuentoInasistencias,
    calculos.salarioNetoPendiente, calculos.totalIngresos, calculos.totalDescuentos, calculos.totalNetoLiquidacion,
    id
  ]);

  return { id, ...calculos };
}

async function eliminarLiquidacion(id) {
  await db.query('DELETE FROM LIQUIDACION WHERE IdLiquidacion = ?', [id]);
}

async function obtenerLiquidaciones() {
  const sql = `
    SELECT 
      l.IdLiquidacion, l.IdEmpleado, CONCAT(p.Nombre, ' ', p.Apellido) AS NombreEmpleado,
      pu.Nombre AS NombrePuesto, 
      DATE_FORMAT(l.FechaContratacion, '%Y-%m-%d') AS FechaContratacion,
      DATE_FORMAT(l.FechaEgreso, '%Y-%m-%d') AS FechaEgreso,
      DATE_FORMAT(l.FechaLiquidacion, '%Y-%m-%d') AS FechaLiquidacion,
      l.MotivoEgreso, l.IngresoSueldoBase, l.DescuentoInasistencias,
      l.TotalIngresos, l.TotalDescuentos,
      l.SalarioNeto AS SalarioNetoPendiente,
      l.TotalNeto AS TotalNetoLiquidacion,
      l.UsuarioCreacion
    FROM LIQUIDACION l
    INNER JOIN EMPLEADO e ON l.IdEmpleado = e.IdEmpleado
    INNER JOIN PERSONA p ON e.IdPersona = p.IdPersona
    INNER JOIN PUESTO pu ON l.IdPuesto = pu.IdPuesto
    ORDER BY l.IdLiquidacion ASC`;
  const [rows] = await db.query(sql);
  return rows;
}

async function obtenerPorId(id) {
  const sql = `
    SELECT 
      l.*,
      DATE_FORMAT(l.FechaContratacion, '%Y-%m-%d') AS FechaContratacion,
      DATE_FORMAT(l.FechaEgreso, '%Y-%m-%d') AS FechaEgreso,
      DATE_FORMAT(l.FechaLiquidacion, '%Y-%m-%d') AS FechaLiquidacion,
      l.SalarioNeto AS SalarioNetoPendiente,
      l.TotalNeto AS TotalNetoLiquidacion,
      CONCAT(p.Nombre, ' ', p.Apellido) AS NombreEmpleado,
      pu.Nombre AS NombrePuesto
    FROM LIQUIDACION l
    INNER JOIN EMPLEADO e ON l.IdEmpleado = e.IdEmpleado
    INNER JOIN PERSONA p ON e.IdPersona = p.IdPersona
    INNER JOIN PUESTO pu ON l.IdPuesto = pu.IdPuesto
    WHERE l.IdLiquidacion = ?`;
  const [rows] = await db.query(sql, [id]);
  if (!rows[0]) return null;
  const item = rows[0];
  const salarioDiario = redondear(Number(item.IngresoSueldoBase || 0) / 30);
  const diasEstimados = salarioDiario > 0
    ? redondear(Number(item.DescuentoInasistencias || 0) / salarioDiario)
    : 0;
  return {
    ...item,
    SalarioDiario: salarioDiario,
    DescuentoDiario: salarioDiario,
    DiasFaltados: diasEstimados,
    DiasInasistencia: diasEstimados
  };
}

module.exports = {
  obtenerUltimoPeriodoPlanillaEmpleado,
  validarFechasLiquidacion,
  calcularDescuentoPorInasistencia,
  calcularPrestacionesLaborales,
  registrarLiquidacionTransaccional,
  actualizarLiquidacion,
  eliminarLiquidacion,
  obtenerLiquidaciones,
  obtenerPorId,
  normalizarFechaIso,
  formatearFechaIsoAEsp,
  parsearFechaSegura
};
