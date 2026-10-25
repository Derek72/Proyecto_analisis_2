require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./Routes/authRoutes.js');
const usuarioRoutes = require('./Routes/usuarioRoutes.js');
const catalogoRoutes = require('./Routes/catalogoRoutes.js');
const seguridadRoutes = require('./Routes/seguridadRoutes.js');
const planillaRoutes = require('./Routes/planillaRoutes.js');

const app = express();
const PORT = 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  
  allowedHeaders: ['Content-Type', 'Authorization', 'x-role-id']
}));

app.use(express.json());

app.use(express.static('public', {
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    }
  }
}));

app.use('/auth', authRoutes);
app.use('/usuario', usuarioRoutes);
app.use('/catalogos', catalogoRoutes);
app.use('/seguridad', seguridadRoutes);
app.use('/planilla', planillaRoutes);

if (process.env.SINCRONIZAR_ISR === '1') {
  require('./Model/planillaModel.js').sincronizarIsrPlanillasExistentes();
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor iniciado en http://127.0.0.1:${PORT}`);
});