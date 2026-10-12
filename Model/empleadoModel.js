const { db } = require('../Config/db.js');

const SELECT_BASE = `
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
    e.DescuentoIgss,
    e.DescuentoIsr,
    e.DescuentoInasistencias,
    e.FechaCreacion,
    e.UsuarioCreacion
  FROM EMPLEADO e
  INNER JOIN PERSONA p ON e.IdPersona = p.IdPersona
  INNER JOIN SUCURSAL s ON e.IdSucursal = s.IdSucursal
  INNER JOIN PUESTO pu ON e.IdPuesto = pu.IdPuesto
  INNER JOIN STATUS_EMPLEADO st ON e.IdStatusEmpleado = st.IdStatusEmpleado
`;

async function obtenerTodos() {
  const [rows] = await db.query(SELECT_BASE + ' ORDER BY e.IdEmpleado');
  return rows;
}

async function obtenerPorId(id) {
  const [rows] = await db.query(SELECT_BASE + ' WHERE e.IdEmpleado = ?', [id]);
  return rows[0] || null;
}

// Listas para los combobox de la pantalla de Empleados
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

// ¿La persona ya está registrada como empleado? (se excluye el propio registro al editar)
async function personaYaEsEmpleado(idPersona, excluirIdEmpleado = null) {
  const [rows] = await db.query(
    'SELECT IdEmpleado FROM EMPLEADO WHERE IdPersona = ? AND IdEmpleado <> ?',
    [idPersona, excluirIdEmpleado || 0]
  );
  return rows.length > 0;
}

// ¿Existe en FLUJO_STATUS_EMPLEADO la transición actual -> nuevo?
async function flujoPermitido(idActual, idNuevo) {
  const [rows] = await db.query(
    'SELECT 1 FROM FLUJO_STATUS_EMPLEADO WHERE IdStatusActual = ? AND IdStatusNuevo = ?',
    [idActual, idNuevo]
  );
  return rows.length > 0;
}

async function crear(d) {
  const sql = `
    INSERT INTO EMPLEADO
      (IdPersona, IdSucursal, FechaContratacion, IdPuesto, IdStatusEmpleado,
       IngresoSueldoBase, IngresoBonificacionDecreto, IngresoOtrosIngresos,
       DescuentoIgss, DescuentoIsr, DescuentoInasistencias, FechaCreacion, UsuarioCreacion)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`;
  await db.query(sql, [
    d.IdPersona, d.IdSucursal, d.FechaContratacion, d.IdPuesto, d.IdStatusEmpleado,
    d.IngresoSueldoBase, d.IngresoBonificacionDecreto, d.IngresoOtrosIngresos,
    d.DescuentoIgss, d.DescuentoIsr, d.DescuentoInasistencias, d.UsuarioCreacion
  ]);
}

async function actualizar(id, d) {
  const sql = `
    UPDATE EMPLEADO SET
      IdPersona = ?, IdSucursal = ?, FechaContratacion = ?, IdPuesto = ?, IdStatusEmpleado = ?,
      IngresoSueldoBase = ?, IngresoBonificacionDecreto = ?, IngresoOtrosIngresos = ?,
      DescuentoIgss = ?, DescuentoIsr = ?, DescuentoInasistencias = ?,
      FechaModificacion = NOW(), UsuarioModificacion = ?
    WHERE IdEmpleado = ?`;
  await db.query(sql, [
    d.IdPersona, d.IdSucursal, d.FechaContratacion, d.IdPuesto, d.IdStatusEmpleado,
    d.IngresoSueldoBase, d.IngresoBonificacionDecreto, d.IngresoOtrosIngresos,
    d.DescuentoIgss, d.DescuentoIsr, d.DescuentoInasistencias, d.UsuarioModificacion, id
  ]);
}

async function eliminar(id) {
  await db.query('DELETE FROM EMPLEADO WHERE IdEmpleado = ?', [id]);
}

module.exports = {
  obtenerTodos, obtenerPorId, obtenerCombos, personaYaEsEmpleado,
  flujoPermitido, crear, actualizar, eliminar
};
