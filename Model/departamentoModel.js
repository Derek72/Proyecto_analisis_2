const { db } = require('../Config/db.js');

async function obtenerTodos() {
  const sql = `
    SELECT 
      d.IdDepartamento, 
      d.Nombre, 
      d.IdEmpresa, 
      e.Nombre AS NombreEmpresa,
      d.FechaCreacion, 
      d.UsuarioCreacion
    FROM DEPARTAMENTO d
    INNER JOIN EMPRESA e ON d.IdEmpresa = e.IdEmpresa
  `;
  const [rows] = await db.query(sql);
  return rows;
}

async function crear(datos) {
  const { Nombre, IdEmpresa, UsuarioCreacion } = datos;
  const sql = 'INSERT INTO DEPARTAMENTO (Nombre, IdEmpresa, FechaCreacion, UsuarioCreacion) VALUES (?, ?, NOW(), ?)';
  await db.query(sql, [Nombre, IdEmpresa, UsuarioCreacion]);
}

async function actualizar(id, datos) {
  const { Nombre, IdEmpresa, UsuarioModificacion } = datos;
  const sql = 'UPDATE DEPARTAMENTO SET Nombre = ?, IdEmpresa = ?, FechaModificacion = NOW(), UsuarioModificacion = ? WHERE IdDepartamento = ?';
  await db.query(sql, [Nombre, IdEmpresa, UsuarioModificacion, id]);
}

async function eliminar(id) {
  const sql = 'DELETE FROM DEPARTAMENTO WHERE IdDepartamento = ?';
  await db.query(sql, [id]);
}

module.exports = { 
  obtenerTodos, 
  crear, 
  actualizar, 
  eliminar 
};