const express = require('express');
const router = express.Router();
const usuarioController = require('../Controller/usuarioController.js');
const { verificarPermisos } = require('../Middleware/autorizacion.js');

router.post('/usuarios', verificarPermisos('Usuarios', 'Alta'), usuarioController.crear);

module.exports = router;