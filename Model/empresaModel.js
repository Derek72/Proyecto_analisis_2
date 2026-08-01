// Model/empresaModel.js
const { db } = require('../Config/db.js');

async function obtenerEmpresas() {
  const [rows] = await db.query('SELECT * FROM EMPRESA');
  return rows;
}

module.exports = {
  obtenerEmpresas
};