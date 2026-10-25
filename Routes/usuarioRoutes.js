const express = require('express');
const router = express.Router();
const usuarioController = require('../Controller/usuarioController.js');
const generoModel = require('../Model/generoModel.js');
const { verificarPermisos } = require('../Middleware/autorizacion.js');

router.post('/usuarios', verificarPermisos('Usuarios', 'Alta'), usuarioController.crear);

router.get('/perfil/:id', usuarioController.obtenerPerfil);
router.put('/perfil/:id', usuarioController.actualizarPerfil);
router.put('/perfil/:id/password', usuarioController.cambiarPassword);

router.get('/generos-lista', async (req, res) => {
  try {
    const generos = await generoModel.obtenerTodos();
    res.json(generos);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;