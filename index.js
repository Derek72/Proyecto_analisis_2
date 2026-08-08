// index.js
const express = require('express');
const cors = require('cors');

const empresaRoutes = require('./Routes/empresaRoutes.js');
const authRoutes = require('./Routes/authRoutes.js');
const usuarioRoutes = require('./Routes/usuarioRoutes.js');

const app = express();
const PORT = 3000;

// Configuración amplia de CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Rutas
app.use('/empresa', empresaRoutes);
app.use('/auth', authRoutes);
app.use('/usuario', usuarioRoutes);

// Reemplaza tu app.listen con este:
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor iniciado en http://127.0.0.1:${PORT}`);
});