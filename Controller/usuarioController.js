const usuarioModel = require('../Model/usuarioModel.js');
const bcrypt = require('bcrypt');
const { validarPasswordContraPolitica, obtenerPoliticaPorSucursal } = require('../Utils/passwordPolicy.js');

async function crear(req, res) {
  const { 
    IdUsuario, Password, Nombre, Apellido, IdRole,
    FechaNacimiento, IdGenero, IdSucursal 
  } = req.body;

  if (!IdUsuario || !Password || !Nombre || !Apellido || !IdRole || !FechaNacimiento || !IdGenero || !IdSucursal) {
    return res.status(400).json({ mensaje: 'Faltan campos obligatorios para crear el usuario' });
  }

  if (req.body.TelefonoMovil && req.body.TelefonoMovil.length > 30) {
    return res.status(400).json({ mensaje: 'El teléfono móvil no puede exceder 30 caracteres.' });
  }

  try {
    const usuarioExistente = await usuarioModel.obtenerPorId(IdUsuario);
    
    if (usuarioExistente) {
      return res.status(409).json({ mensaje: 'El nombre de usuario ya está en uso' });
    }

    const politica = await obtenerPoliticaPorSucursal(IdSucursal);
    const resultado = validarPasswordContraPolitica(Password, politica);
    if (!resultado.valido) {
      return res.status(400).json({ mensaje: resultado.mensaje });
    }

    await usuarioModel.crearUsuario(req.body);
    
    res.status(201).json({ mensaje: 'Usuario creado exitosamente' });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function obtenerPerfil(req, res) {
  try {
    const perfil = await usuarioModel.obtenerParaPerfil(req.params.id);
    if (!perfil) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    res.json(perfil);
  } catch (error) { res.status(500).json({ error: error.message }); }
}

async function actualizarPerfil(req, res) {
  try {
    if (req.body.TelefonoMovil && req.body.TelefonoMovil.length > 30) {
      return res.status(400).json({ mensaje: 'El teléfono móvil no puede exceder 30 caracteres.' });
    }
    await usuarioModel.actualizarPerfil(req.params.id, req.body);
    res.json({ mensaje: 'Perfil actualizado exitosamente' });
  } catch (error) { res.status(500).json({ error: error.message }); }
}

async function cambiarPassword(req, res) {
  try {
    const { PasswordActual, PasswordNueva } = req.body;
    const idUsuario = req.params.id;

    if (!PasswordActual || !PasswordNueva) {
      return res.status(400).json({ mensaje: 'Debes ingresar tu contraseña actual y la nueva.' });
    }

    const usuario = await usuarioModel.obtenerPorId(idUsuario);
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    const passwordValida = await bcrypt.compare(PasswordActual, usuario.Password);
    if (!passwordValida) {
      return res.status(401).json({ mensaje: 'La contraseña actual es incorrecta.' });
    }

    const politica = await obtenerPoliticaPorSucursal(usuario.IdSucursal);
    const resultado = validarPasswordContraPolitica(PasswordNueva, politica);
    if (!resultado.valido) {
      return res.status(400).json({ mensaje: resultado.mensaje });
    }

    await usuarioModel.cambiarPasswordPropia(idUsuario, PasswordNueva);
    res.json({ mensaje: 'Contraseña actualizada exitosamente' });
  } catch (error) { res.status(500).json({ error: error.message }); }
}

module.exports = { crear, obtenerPerfil, actualizarPerfil, cambiarPassword };