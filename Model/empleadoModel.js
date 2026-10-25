const { db } = require('../Config/db.js');

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

function calcularIsrPorTramo(sueldoBase) {
  const base = Number(sueldoBase) || 0;
  if (base <= 0) {
    return { porcentaje: 5, monto: 0 };
  }
  const porcentaje = base <= 30000 ? 5 : 7;
  const monto = redondear(base * (porcentaje / 100));
  return { porcentaje, monto };
}

function calcularDescuentoDiario(sueldoBase) {
  const base = Number(sueldoBase) || 0;
  if (base <= 0) return 0;
  return redondear(base / 30);
}

function calcularEfectivoEmpleado(emp) {
  const base = Number(emp.IngresoSueldoBase) || 0;
  const bono = Number(emp.IngresoBonificacionDecreto) || 0;
  const otros = Number(emp.IngresoOtrosIngresos) || 0;
  const igss = Number(emp.DescuentoIgss) || 0;
  const isr = calcularIsrPorTramo(base).monto;
  return redondear((base + bono + otros) - (igss + isr));
}

let esquemaEmpleadoCache = null;

async function verificarEsquemaEmpleado() {
  if (esquemaEmpleadoCache !== null) return esquemaEmpleadoCache;
  const esquema = {
    tienePorcentajeIgss: false,
    tienePorcentajeIsr: false,
    tienePorcentajeInasistencias: false,
    tieneEfectivo: false
  };
  try {
    const [cols] = await db.query('SHOW COLUMNS FROM EMPLEADO');
    const nombres = new Set(cols.map(c => c.Field));

    if (!nombres.has('PorcentajeIgss')) {
      try {
        await db.query("ALTER TABLE EMPLEADO ADD COLUMN PorcentajeIgss DECIMAL(5,2) NOT NULL DEFAULT 4.83 AFTER IngresoOtrosIngresos");
        nombres.add('PorcentajeIgss');
      } catch (_) {}
    }
    if (!nombres.has('PorcentajeIsr')) {
      try {
        await db.query("ALTER TABLE EMPLEADO ADD COLUMN PorcentajeIsr DECIMAL(5,2) NOT NULL DEFAULT 5.00 AFTER DescuentoIgss");
        nombres.add('PorcentajeIsr');
      } catch (_) {}
    }
    if (!nombres.has('PorcentajeInasistencias')) {
      try {
        await db.query("ALTER TABLE EMPLEADO ADD COLUMN PorcentajeInasistencias DECIMAL(5,2) NOT NULL DEFAULT 100.00 AFTER DescuentoIsr");
        nombres.add('PorcentajeInasistencias');
      } catch (_) {}
    }

    try {
      if (nombres.has('PorcentajeIsr')) {
        await db.query(`
          UPDATE EMPLEADO
          SET PorcentajeIsr = CASE WHEN IngresoSueldoBase <= 30000 THEN 5.00 ELSE 7.00 END,
              DescuentoIsr = ROUND(IngresoSueldoBase * (CASE WHEN IngresoSueldoBase <= 30000 THEN 0.05 ELSE 0.07 END), 2),
              DescuentoInasistencias = ROUND(IngresoSueldoBase / 30, 2)
          WHERE IngresoSueldoBase > 0 AND (DescuentoIsr = 0 OR DescuentoInasistencias = 0)
        `);
      } else {
        await db.query(`
          UPDATE EMPLEADO
          SET DescuentoIsr = ROUND(IngresoSueldoBase * (CASE WHEN IngresoSueldoBase <= 30000 THEN 0.05 ELSE 0.07 END), 2),
              DescuentoInasistencias = ROUND(IngresoSueldoBase / 30, 2)
          WHERE IngresoSueldoBase > 0 AND (DescuentoIsr = 0 OR DescuentoInasistencias = 0)
        `);
      }
    } catch (_) {}

    esquema.tienePorcentajeIgss = nombres.has('PorcentajeIgss');
    esquema.tienePorcentajeIsr = nombres.has('PorcentajeIsr');
    esquema.tienePorcentajeInasistencias = nombres.has('PorcentajeInasistencias');
    esquema.tieneEfectivo = nombres.has('Efectivo');
    esquemaEmpleadoCache = esquema;
  } catch (err) {
    esquemaEmpleadoCache = esquema;
  }
  return esquemaEmpleadoCache;
}

function generarSelectBase(esquema) {
  const colPctIgss = esquema.tienePorcentajeIgss
    ? 'COALESCE(e.PorcentajeIgss, 4.83) AS PorcentajeIgss,'
    : 'CASE WHEN e.IngresoSueldoBase > 0 AND e.DescuentoIgss > 0 THEN ROUND((e.DescuentoIgss / e.IngresoSueldoBase) * 100, 2) ELSE 4.83 END AS PorcentajeIgss,';

  const colPctIsr = 'CASE WHEN e.IngresoSueldoBase <= 30000 THEN 5.00 ELSE 7.00 END AS PorcentajeIsr,';

  const colPctInas = esquema.tienePorcentajeInasistencias
    ? 'COALESCE(e.PorcentajeInasistencias, 100.00) AS PorcentajeInasistencias,'
    : '100.00 AS PorcentajeInasistencias,';

  return `
    SELECT
      e.IdEmpleado,
      e.IdPersona,
      CONCAT(p.Nombre, ' ', p.Apellido) AS NombrePersona,
      e.IdSucursal,
      s.Nombre AS NombreSucursal,
      DATE_FORMAT(e.FechaContratacion, '%Y-%m-%d') AS FechaContratacion,
      e.IdPuesto,
      pu.Nombre AS NombrePuesto,
      e.IdStatusEmpleado,
      st.Nombre AS NombreStatus,
      e.IngresoSueldoBase,
      e.IngresoBonificacionDecreto,
      e.IngresoOtrosIngresos,
      ${colPctIgss}
      e.DescuentoIgss,
      ${colPctIsr}
      ROUND(e.IngresoSueldoBase * (CASE WHEN e.IngresoSueldoBase <= 30000 THEN 0.05 ELSE 0.07 END), 2) AS DescuentoIsr,
      ${colPctInas}
      ROUND(e.IngresoSueldoBase / 30, 2) AS DescuentoInasistencias,
      ROUND(e.IngresoSueldoBase / 30, 2) AS DescuentoDiario,
      (
        SELECT COALESCE(
          DATE_FORMAT(per.FechaFin, '%Y-%m-%d'),
          DATE_FORMAT(LAST_DAY(STR_TO_DATE(CONCAT(pd.Anio, '-', LPAD(pd.Mes, 2, '0'), '-01'), '%Y-%m-%d')), '%Y-%m-%d')
        )
        FROM PLANILLA_DETALLE pd
        INNER JOIN PLANILLA_CABECERA pc ON pc.Anio = pd.Anio AND pc.Mes = pd.Mes
        LEFT JOIN PERIODO_PLANILLA per ON per.Anio = pd.Anio AND per.Mes = pd.Mes
        WHERE pd.IdEmpleado = e.IdEmpleado
        ORDER BY pd.Anio DESC, pd.Mes DESC
        LIMIT 1
      ) AS UltimaFechaFinPlanilla,
      (
        SELECT pd.Anio
        FROM PLANILLA_DETALLE pd
        INNER JOIN PLANILLA_CABECERA pc ON pc.Anio = pd.Anio AND pc.Mes = pd.Mes
        WHERE pd.IdEmpleado = e.IdEmpleado
        ORDER BY pd.Anio DESC, pd.Mes DESC
        LIMIT 1
      ) AS UltimoAnioPlanilla,
      (
        SELECT pd.Mes
        FROM PLANILLA_DETALLE pd
        INNER JOIN PLANILLA_CABECERA pc ON pc.Anio = pd.Anio AND pc.Mes = pd.Mes
        WHERE pd.IdEmpleado = e.IdEmpleado
        ORDER BY pd.Anio DESC, pd.Mes DESC
        LIMIT 1
      ) AS UltimoMesPlanilla,
      e.FechaCreacion,
      e.UsuarioCreacion
    FROM EMPLEADO e
    INNER JOIN PERSONA p ON e.IdPersona = p.IdPersona
    INNER JOIN SUCURSAL s ON e.IdSucursal = s.IdSucursal
    INNER JOIN PUESTO pu ON e.IdPuesto = pu.IdPuesto
    INNER JOIN STATUS_EMPLEADO st ON e.IdStatusEmpleado = st.IdStatusEmpleado
  `;
}

function normalizarFilaEmpleado(row) {
  if (!row) return null;
  const base = Number(row.IngresoSueldoBase) || 0;
  const pctIgss = (row.PorcentajeIgss !== undefined && row.PorcentajeIgss !== null)
    ? Number(row.PorcentajeIgss)
    : 4.83;
  const descIgss = (row.DescuentoIgss !== undefined && row.DescuentoIgss !== null && Number(row.DescuentoIgss) > 0)
    ? redondear(row.DescuentoIgss)
    : redondear(base * (pctIgss / 100));
  const isrInfo = calcularIsrPorTramo(base);
  const descDiario = calcularDescuentoDiario(base);
  const efectivo = calcularEfectivoEmpleado({
    ...row,
    IngresoSueldoBase: base,
    DescuentoIgss: descIgss,
    DescuentoIsr: isrInfo.monto
  });
  return {
    ...row,
    PorcentajeIgss: pctIgss,
    DescuentoIgss: descIgss,
    PorcentajeIsr: isrInfo.porcentaje,
    DescuentoIsr: isrInfo.monto,
    DescuentoDiario: descDiario,
    DescuentoInasistencias: descDiario,
    Efectivo: efectivo
  };
}

async function obtenerTodos() {
  const esquema = await verificarEsquemaEmpleado();
  const sql = generarSelectBase(esquema) + ' ORDER BY e.IdEmpleado ASC';
  const [rows] = await db.query(sql);
  return rows.map(normalizarFilaEmpleado);
}

async function obtenerPorId(id) {
  const esquema = await verificarEsquemaEmpleado();
  const sql = generarSelectBase(esquema) + ' WHERE e.IdEmpleado = ?';
  const [rows] = await db.query(sql, [id]);
  return rows[0] ? normalizarFilaEmpleado(rows[0]) : null;
}

async function obtenerCombos() {
  const [personas] = await db.query(`
    SELECT p.IdPersona, CONCAT(p.Nombre, ' ', p.Apellido) AS NombreCompleto, e.IdEmpleado
    FROM PERSONA p
    LEFT JOIN EMPLEADO e ON e.IdPersona = p.IdPersona
    ORDER BY p.Nombre, p.Apellido`);
  const [sucursales] = await db.query('SELECT IdSucursal, Nombre FROM SUCURSAL ORDER BY Nombre');
  const [puestos] = await db.query(`
    SELECT pu.IdPuesto, pu.Nombre, d.Nombre AS NombreDepartamento
    FROM PUESTO pu INNER JOIN DEPARTAMENTO d ON pu.IdDepartamento = d.IdDepartamento
    ORDER BY pu.Nombre`);
  const [status] = await db.query('SELECT IdStatusEmpleado, Nombre FROM STATUS_EMPLEADO ORDER BY IdStatusEmpleado');
  return { personas, sucursales, puestos, status };
}

async function personaYaEsEmpleado(idPersona, excluirIdEmpleado = null) {
  const [rows] = await db.query(
    'SELECT IdEmpleado FROM EMPLEADO WHERE IdPersona = ? AND IdEmpleado <> ?',
    [idPersona, excluirIdEmpleado || 0]
  );
  return rows.length > 0;
}

async function flujoPermitido(idActual, idNuevo) {
  const [rows] = await db.query(
    'SELECT 1 FROM FLUJO_STATUS_EMPLEADO WHERE IdStatusActual = ? AND IdStatusNuevo = ?',
    [idActual, idNuevo]
  );
  return rows.length > 0;
}

async function crear(d) {
  const fechaContratacion = normalizarFechaIso(d.FechaContratacion);
  const base = Number(d.IngresoSueldoBase) || 0;
  const pctIgss = (d.PorcentajeIgss !== undefined && d.PorcentajeIgss !== null && d.PorcentajeIgss !== '')
    ? Number(d.PorcentajeIgss)
    : 4.83;
  const isrInfo = calcularIsrPorTramo(base);
  const pctIsr = isrInfo.porcentaje;
  const pctInas = 100.00;

  const descIgss = redondear(base * (pctIgss / 100));
  const descIsr = isrInfo.monto;
  const descInas = calcularDescuentoDiario(base);
  const efectivo = calcularEfectivoEmpleado({
    IngresoSueldoBase: base,
    IngresoBonificacionDecreto: d.IngresoBonificacionDecreto,
    IngresoOtrosIngresos: d.IngresoOtrosIngresos,
    DescuentoIgss: descIgss,
    DescuentoIsr: descIsr,
    DescuentoInasistencias: descInas
  });

  const esquema = await verificarEsquemaEmpleado();
  const cols = [
    'IdPersona', 'IdSucursal', 'FechaContratacion', 'IdPuesto', 'IdStatusEmpleado',
    'IngresoSueldoBase', 'IngresoBonificacionDecreto', 'IngresoOtrosIngresos'
  ];
  const vals = [
    d.IdPersona, d.IdSucursal, fechaContratacion, d.IdPuesto, d.IdStatusEmpleado,
    d.IngresoSueldoBase, d.IngresoBonificacionDecreto, d.IngresoOtrosIngresos
  ];

  if (esquema.tienePorcentajeIgss) { cols.push('PorcentajeIgss'); vals.push(pctIgss); }
  cols.push('DescuentoIgss'); vals.push(descIgss);
  if (esquema.tienePorcentajeIsr) { cols.push('PorcentajeIsr'); vals.push(pctIsr); }
  cols.push('DescuentoIsr'); vals.push(descIsr);
  if (esquema.tienePorcentajeInasistencias) { cols.push('PorcentajeInasistencias'); vals.push(pctInas); }
  cols.push('DescuentoInasistencias'); vals.push(descInas);
  if (esquema.tieneEfectivo) { cols.push('Efectivo'); vals.push(efectivo); }

  cols.push('FechaCreacion', 'UsuarioCreacion');
  const placeholders = vals.map(() => '?').join(', ');
  const sql = `INSERT INTO EMPLEADO (${cols.join(', ')}) VALUES (${placeholders}, NOW(), ?)`;
  vals.push(d.UsuarioCreacion);

  await db.query(sql, vals);
}

async function actualizar(id, d) {
  const fechaContratacion = normalizarFechaIso(d.FechaContratacion);
  const base = Number(d.IngresoSueldoBase) || 0;
  const pctIgss = (d.PorcentajeIgss !== undefined && d.PorcentajeIgss !== null && d.PorcentajeIgss !== '')
    ? Number(d.PorcentajeIgss)
    : 4.83;
  const isrInfo = calcularIsrPorTramo(base);
  const pctIsr = isrInfo.porcentaje;
  const pctInas = 100.00;

  const descIgss = redondear(base * (pctIgss / 100));
  const descIsr = isrInfo.monto;
  const descInas = calcularDescuentoDiario(base);
  const efectivo = calcularEfectivoEmpleado({
    IngresoSueldoBase: base,
    IngresoBonificacionDecreto: d.IngresoBonificacionDecreto,
    IngresoOtrosIngresos: d.IngresoOtrosIngresos,
    DescuentoIgss: descIgss,
    DescuentoIsr: descIsr,
    DescuentoInasistencias: descInas
  });

  const esquema = await verificarEsquemaEmpleado();
  const sets = [
    'IdPersona = ?', 'IdSucursal = ?', 'FechaContratacion = ?', 'IdPuesto = ?', 'IdStatusEmpleado = ?',
    'IngresoSueldoBase = ?', 'IngresoBonificacionDecreto = ?', 'IngresoOtrosIngresos = ?'
  ];
  const vals = [
    d.IdPersona, d.IdSucursal, fechaContratacion, d.IdPuesto, d.IdStatusEmpleado,
    d.IngresoSueldoBase, d.IngresoBonificacionDecreto, d.IngresoOtrosIngresos
  ];

  if (esquema.tienePorcentajeIgss) { sets.push('PorcentajeIgss = ?'); vals.push(pctIgss); }
  sets.push('DescuentoIgss = ?'); vals.push(descIgss);
  if (esquema.tienePorcentajeIsr) { sets.push('PorcentajeIsr = ?'); vals.push(pctIsr); }
  sets.push('DescuentoIsr = ?'); vals.push(descIsr);
  if (esquema.tienePorcentajeInasistencias) { sets.push('PorcentajeInasistencias = ?'); vals.push(pctInas); }
  sets.push('DescuentoInasistencias = ?'); vals.push(descInas);
  if (esquema.tieneEfectivo) { sets.push('Efectivo = ?'); vals.push(efectivo); }

  sets.push('FechaModificacion = NOW()', 'UsuarioModificacion = ?');
  vals.push(d.UsuarioModificacion, id);

  const sql = `UPDATE EMPLEADO SET ${sets.join(', ')} WHERE IdEmpleado = ?`;
  await db.query(sql, vals);
}

async function eliminar(id) {
  await db.query('DELETE FROM EMPLEADO WHERE IdEmpleado = ?', [id]);
}

module.exports = {
  obtenerTodos,
  obtenerPorId,
  obtenerCombos,
  personaYaEsEmpleado,
  flujoPermitido,
  crear,
  actualizar,
  eliminar,
  calcularIsrPorTramo,
  calcularDescuentoDiario,
  calcularEfectivoEmpleado,
  normalizarFechaIso
};
