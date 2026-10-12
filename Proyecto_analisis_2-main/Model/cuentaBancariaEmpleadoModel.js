const { db } = require('../Config/db.js');

async function obtenerTodos() {
  const sql = `
    SELECT
      c.IdCuentaBancaria,
      c.IdEmpleado,
      CONCAT(p.Nombre, ' ', p.Apellido) AS NombreEmpleado,
      c.IdBanco,
      b.Nombre AS NombreBanco,
      c.NumeroDeCuenta,
      c.Activa,
      c.FechaCreacion,
      c.UsuarioCreacion
    FROM CUENTA_BANCARIA_EMPLEADO c
    INNER JOIN EMPLEADO e ON c.IdEmpleado = e.IdEmpleado
    INNER JOIN PERSONA p ON e.IdPersona = p.IdPersona
    INNER JOIN BANCO b ON c.IdBanco = b.IdBanco
    ORDER BY c.IdCuentaBancaria`;
  const [rows] = await db.query(sql);
  return rows;
}

async function obtenerCombos() {
  const [empleados] = await db.query(`
    SELECT e.IdEmpleado, CONCAT(p.Nombre, ' ', p.Apellido) AS NombreCompleto
    FROM EMPLEADO e INNER JOIN PERSONA p ON e.IdPersona = p.IdPersona
    ORDER BY p.Nombre, p.Apellido`);
  const [bancos] = await db.query('SELECT IdBanco, Nombre FROM BANCO ORDER BY Nombre');
  return { empleados, bancos };
}

async function existeNumeroEnBanco(idBanco, numero, excluirId = null) {
  const [rows] = await db.query(
    'SELECT IdCuentaBancaria FROM CUENTA_BANCARIA_EMPLEADO WHERE IdBanco = ? AND NumeroDeCuenta = ? AND IdCuentaBancaria <> ?',
    [idBanco, numero, excluirId || 0]
  );
  return rows.length > 0;
}

async function crear(d) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    if (String(d.Activa) === '1') {
      await conn.query(
        `UPDATE CUENTA_BANCARIA_EMPLEADO SET Activa = '0', FechaModificacion = NOW(), UsuarioModificacion = ? WHERE IdEmpleado = ?`,
        [d.UsuarioCreacion, d.IdEmpleado]
      );
    }
    await conn.query(
      `INSERT INTO CUENTA_BANCARIA_EMPLEADO (IdEmpleado, IdBanco, NumeroDeCuenta, Activa, FechaCreacion, UsuarioCreacion)
       VALUES (?, ?, ?, ?, NOW(), ?)`,
      [d.IdEmpleado, d.IdBanco, d.NumeroDeCuenta, String(d.Activa), d.UsuarioCreacion]
    );
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}

async function actualizar(id, d) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    if (String(d.Activa) === '1') {
      await conn.query(
        `UPDATE CUENTA_BANCARIA_EMPLEADO SET Activa = '0', FechaModificacion = NOW(), UsuarioModificacion = ?
         WHERE IdEmpleado = ? AND IdCuentaBancaria <> ?`,
        [d.UsuarioModificacion, d.IdEmpleado, id]
      );
    }
    await conn.query(
      `UPDATE CUENTA_BANCARIA_EMPLEADO SET IdEmpleado = ?, IdBanco = ?, NumeroDeCuenta = ?, Activa = ?,
         FechaModificacion = NOW(), UsuarioModificacion = ?
       WHERE IdCuentaBancaria = ?`,
      [d.IdEmpleado, d.IdBanco, d.NumeroDeCuenta, String(d.Activa), d.UsuarioModificacion, id]
    );
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}

async function eliminar(id) {
  await db.query('DELETE FROM CUENTA_BANCARIA_EMPLEADO WHERE IdCuentaBancaria = ?', [id]);
}

module.exports = { obtenerTodos, obtenerCombos, existeNumeroEnBanco, crear, actualizar, eliminar };
