// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importar las rutas según la nueva arquitectura
const authRoutes = require('./Routes/authRoutes.js');
const usuarioRoutes = require('./Routes/usuarioRoutes.js');
const catalogoRoutes = require('./Routes/catalogoRoutes.js');
const seguridadRoutes = require('./Routes/seguridadRoutes.js');
const planillaRoutes = require('./Routes/planillaRoutes.js');

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

// Evita que el navegador guarde las páginas .html en caché (incluida la "back-forward cache").
// Se configura con el setHeaders de express.static, que corre DESPUÉS de sus headers por
// defecto — si lo pusiéramos en un middleware aparte antes de este, express.static lo pisaba
// con su propio "Cache-Control: public, max-age=0" y el navegador seguía cacheando la página.
app.use(express.static('public', {
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    }
  }
}));

// Registro de Endpoints
app.use('/auth', authRoutes);
app.use('/usuario', usuarioRoutes);
app.use('/catalogos', catalogoRoutes);
app.use('/seguridad', seguridadRoutes);
app.use('/planilla', planillaRoutes);

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor iniciado en http://127.0.0.1:${PORT}`);
});