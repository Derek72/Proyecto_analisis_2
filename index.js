// index.js
const express = require('express');
const { conectarBD } = require('./Config/db.js');
const empresaRoutes = require('./Routes/empresaRoutes.js');

const app = express();
const PORT = 3000;

app.use(express.json());

// Probar conexión
conectarBD();

// Rutas
app.use('/empresa', empresaRoutes);
app.use('/empresa', empresaRoutes);

app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});