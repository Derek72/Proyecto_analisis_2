const express = require('express');
const router = express.Router();
const authController = require('../Controller/authController.js');

router.post('/login', authController.login);
router.get('/pregunta/:idUsuario', authController.obtenerPregunta);
router.post('/recuperar', authController.recuperarPassword);

module.exports = router;