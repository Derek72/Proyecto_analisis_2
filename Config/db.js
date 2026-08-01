const mysql = require('mysql2/promise');

// Configuración de la conexión a la base de datos
const dbConfig = {
    host: 'localhost',      // O la IP de tu servidor MySQL
    user: 'root',     // Tu usuario de MySQL (ej. root)
    password: '', // Tu contraseña de MySQL
    database: 'proyectoanalisis' // El nombre de tu base de datos
};

async function conectarBD() {
    try {
        // Crear la conexión
        const connection = await mysql.createConnection(dbConfig);
        console.log('¡Conexión exitosa a la base de datos MySQL!');

       

    } catch (error) {
        console.error('Error al conectar o consultar la base de datos:', error.message);
    }
}

module.exports = { conectarBD };