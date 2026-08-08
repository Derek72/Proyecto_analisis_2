// index.js
const express = require('express');

const empresaRoutes = require('./Routes/empresaRoutes.js');
const authRoutes = require('./Routes/authRoutes.js');
const usuarioRoutes = require('./Routes/usuarioRoutes.js');

const app = express();
const PORT = 3000;

app.use(express.json());



// Rutas
app.use('/empresa', empresaRoutes);
app.use('/auth', authRoutes);
app.use('/usuario', usuarioRoutes);


app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});

