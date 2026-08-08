const usuarioModel = require('../Model/usuarioModel.js');
const bcrypt = require('bcrypt');

async function crear(req, res) {
  const { 
    IdUsuario, Password, Nombre, Apellido, IdRole,
    FechaNacimiento, IdGenero, IdSucursal 
  } = req.body;

  // Validación de los campos que obligatoriamente no deberían ir vacíos
  if (!IdUsuario || !Password || !Nombre || !Apellido || !IdRole || !FechaNacimiento || !IdGenero || !IdSucursal) {
    return res.status(400).json({ mensaje: 'Faltan campos obligatorios para crear el usuario' });
  }

  try {
    // 1. Verificar si el IdUsuario ya existe
    const usuarioExistente = await usuarioModel.obtenerPorId(IdUsuario);
    
    if (usuarioExistente) {
      return res.status(409).json({ mensaje: 'El nombre de usuario ya está en uso' });
    }

    // 2. Crear el usuario pasando todo el body
    await usuarioModel.crearUsuario(req.body);
    
    res.status(201).json({ mensaje: 'Usuario creado exitosamente' });

  } catch (error) {
    // Manejo de errores (ej. claves foráneas incorrectas de IdRole o IdSucursal)
    res.status(500).json({ error: error.message });
  }
}

module.exports = { crear };