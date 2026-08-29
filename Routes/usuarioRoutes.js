const express = require('express');
const router = express.Router();
const usuarioController = require('../Controller/usuarioController.js');
const generoModel = require('../Model/generoModel.js');
const { verificarPermisos } = require('../Middleware/autorizacion.js');

router.post('/usuarios', verificarPermisos('Usuarios', 'Alta'), usuarioController.crear);

// Autoservicio: cualquier usuario logueado puede ver/editar SU PROPIO perfil
// y cambiar SU PROPIA contraseña. No se protege con verificarPermisos('Usuarios', ...)
// porque eso es el permiso para administrar a OTROS usuarios desde el catálogo.
router.get('/perfil/:id', usuarioController.obtenerPerfil);
router.put('/perfil/:id', usuarioController.actualizarPerfil);
router.put('/perfil/:id/password', usuarioController.cambiarPassword);

// Lista simple de géneros para el combo del perfil propio (sin candado de permisos:
// cualquier usuario logueado necesita poder llenar su propio perfil, tenga o no
// el permiso administrativo 'Generos' del catálogo).
router.get('/generos-lista', async (req, res) => {
  try {
    const generos = await generoModel.obtenerTodos();
    res.json(generos);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;