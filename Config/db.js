// Config/db.js
const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',      // Tu usuario de MySQL
  password: '51318095',      // Tu contraseña
  database: 'proyectoAnalisis',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Función opcional para probar la conexión
async function conectarBD() {
  try {
    const connection = await db.getConnection();
    console.log("¡Conexión exitosa a la base de datos MySQL!");
    connection.release();
  } catch (error) {
    console.error("Error al conectar a la base de datos:", error.message);
  }
}

// Exportamos el pool db y la función
module.exports = { db, conectarBD };