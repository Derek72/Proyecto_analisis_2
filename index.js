// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importar las rutas según la nueva arquitectura
const authRoutes = require('./Routes/authRoutes.js');
const usuarioRoutes = require('./Routes/usuarioRoutes.js');
const catalogoRoutes = require('./Routes/catalogoRoutes.js');
const seguridadRoutes = require('./Routes/seguridadRoutes.js');

const app = express();
const PORT = 3000;

// Configuración amplia de CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  // Se agregó 'x-role-id' para permitir el paso del middleware de autorización desde el Front
  allowedHeaders: ['Content-Type', 'Authorization', 'x-role-id']
}));

app.use(express.json());

// Registro de Endpoints
app.use('/auth', authRoutes);
app.use('/usuario', usuarioRoutes);
app.use('/catalogos', catalogoRoutes);
app.use('/seguridad', seguridadRoutes);

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor iniciado en http://127.0.0.1:${PORT}`);
});