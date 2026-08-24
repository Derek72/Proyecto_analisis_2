const usuarioModel = require('../Model/usuarioModel.js');
const bcrypt = require('bcrypt');

async function crear(req, res) {
  const { 
    IdUsuario, Password, Nombre, Apellido, IdRole,
    FechaNacimiento, IdGenero, IdSucursal 
  } = req.body;

  if (!IdUsuario || !Password || !Nombre || !Apellido || !IdRole || !FechaNacimiento || !IdGenero || !IdSucursal) {
    return res.status(400).json({ mensaje: 'Faltan campos obligatorios para crear el usuario' });
  }

  try {
    const usuarioExistente = await usuarioModel.obtenerPorId(IdUsuario);
    
    if (usuarioExistente) {
      return res.status(409).json({ mensaje: 'El nombre de usuario ya está en uso' });
    }

    await usuarioModel.crearUsuario(req.body);
    
    res.status(201).json({ mensaje: 'Usuario creado exitosamente' });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { crear };