const express = require('express');
const router = express.Router();
const usuarioController = require('../Controller/usuarioController.js');

// Ruta POST para crear un nuevo usuario
router.post('/', usuarioController.crear);

module.exports = router;