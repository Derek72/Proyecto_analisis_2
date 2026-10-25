require('dotenv').config(); 
const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function conectarBD() {
  try {
    const connection = await db.getConnection();
    console.log("¡Conexión exitosa a la base de datos MySQL!");
    connection.release();
  } catch (error) {
    console.error("Error al conectar a la base de datos:", error.message);
  }
}

module.exports = { db, conectarBD };