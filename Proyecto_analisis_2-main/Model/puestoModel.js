const { db } = require('../Config/db.js');

async function obtenerTodos() {
  const sql = `
    SELECT 
      p.IdPuesto, 
      p.Nombre, 
      p.IdDepartamento, 
      d.Nombre AS NombreDepartamento,
      p.FechaCreacion, 
      p.UsuarioCreacion
    FROM PUESTO p
    INNER JOIN DEPARTAMENTO d ON p.IdDepartamento = d.IdDepartamento
  `;
  const [rows] = await db.query(sql);
  return rows;
}

async function crear(datos) {
  const { Nombre, IdDepartamento, UsuarioCreacion } = datos;
  const sql = 'INSERT INTO PUESTO (Nombre, IdDepartamento, FechaCreacion, UsuarioCreacion) VALUES (?, ?, NOW(), ?)';
  await db.query(sql, [Nombre, IdDepartamento, UsuarioCreacion]);
}

async function actualizar(id, datos) {
  const { Nombre, IdDepartamento, UsuarioModificacion } = datos;
  const sql = 'UPDATE PUESTO SET Nombre = ?, IdDepartamento = ?, FechaModificacion = NOW(), UsuarioModificacion = ? WHERE IdPuesto = ?';
  await db.query(sql, [Nombre, IdDepartamento, UsuarioModificacion, id]);
}

async function eliminar(id) {
  const sql = 'DELETE FROM PUESTO WHERE IdPuesto = ?';
  await db.query(sql, [id]);
}

module.exports = { 
  obtenerTodos, 
  crear, 
  actualizar, 
  eliminar 
};