const { db } = require('../Config/db.js');

async function obtenerTodos() {
  const sql = `
    SELECT
      i.IdInasistencia,
      i.IdEmpleado,
      CONCAT(p.Nombre, ' ', p.Apellido) AS NombreEmpleado,
      DATE_FORMAT(i.FechaInicial, '%Y-%m-%d') AS FechaInicial,
      DATE_FORMAT(i.FechaFinal, '%Y-%m-%d') AS FechaFinal,
      DATEDIFF(i.FechaFinal, i.FechaInicial) + 1 AS Dias,
      i.MotivoInasistencia,
      DATE_FORMAT(i.FechaProcesado, '%Y-%m-%d %H:%i') AS FechaProcesado,
      i.FechaCreacion,
      i.UsuarioCreacion
    FROM INASISTENCIA i
    INNER JOIN EMPLEADO e ON i.IdEmpleado = e.IdEmpleado
    INNER JOIN PERSONA p ON e.IdPersona = p.IdPersona
    ORDER BY i.IdInasistencia ASC`;
  const [rows] = await db.query(sql);
  return rows;
}

async function obtenerPorId(id) {
  const [rows] = await db.query('SELECT * FROM INASISTENCIA WHERE IdInasistencia = ?', [id]);
  return rows[0] || null;
}

async function obtenerEmpleadosCombo() {
  const [rows] = await db.query(`
    SELECT e.IdEmpleado, CONCAT(p.Nombre, ' ', p.Apellido) AS NombreCompleto
    FROM EMPLEADO e INNER JOIN PERSONA p ON e.IdPersona = p.IdPersona
    ORDER BY p.Nombre, p.Apellido`);
  return rows;
}

async function existeTraslape(idEmpleado, fechaInicial, fechaFinal, excluirId = null) {
  const [rows] = await db.query(
    `SELECT IdInasistencia FROM INASISTENCIA
     WHERE IdEmpleado = ? AND IdInasistencia <> ?
       AND DATE(FechaInicial) <= ? AND DATE(FechaFinal) >= ?`,
    [idEmpleado, excluirId || 0, fechaFinal, fechaInicial]
  );
  return rows.length > 0;
}

async function crear(d) {
  await db.query(
    `INSERT INTO INASISTENCIA (IdEmpleado, FechaInicial, FechaFinal, MotivoInasistencia, FechaCreacion, UsuarioCreacion)
     VALUES (?, ?, ?, ?, NOW(), ?)`,
    [d.IdEmpleado, d.FechaInicial, d.FechaFinal, d.MotivoInasistencia, d.UsuarioCreacion]
  );
}

async function actualizar(id, d) {
  await db.query(
    `UPDATE INASISTENCIA SET IdEmpleado = ?, FechaInicial = ?, FechaFinal = ?, MotivoInasistencia = ?,
       FechaModificacion = NOW(), UsuarioModificacion = ?
     WHERE IdInasistencia = ?`,
    [d.IdEmpleado, d.FechaInicial, d.FechaFinal, d.MotivoInasistencia, d.UsuarioModificacion, id]
  );
}

async function eliminar(id) {
  await db.query('DELETE FROM INASISTENCIA WHERE IdInasistencia = ?', [id]);
}

module.exports = { obtenerTodos, obtenerPorId, obtenerEmpleadosCombo, existeTraslape, crear, actualizar, eliminar };
