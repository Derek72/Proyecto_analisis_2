// index.js
const express = require('express');

const empresaRoutes = require('./Routes/empresaRoutes.js');
const authRoutes = require('./Routes/authRoutes.js');

const app = express();
const PORT = 3000;

app.use(express.json());



// Rutas
app.use('/empresa', empresaRoutes);

app.use('/auth', authRoutes);


app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});

