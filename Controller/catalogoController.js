const empresaModel = require('../Model/empresaModel.js');
const sucursalModel = require('../Model/sucursalModel.js');
const generoModel = require('../Model/generoModel.js');
const statusUsuarioModel = require('../Model/statusUsuarioModel.js');
const roleModel = require('../Model/roleModel'); 
const moduloModel = require('../Model/moduloModel.js');
const menuModel = require('../Model/menuModel.js');
const opcionModel = require('../Model/opcionModel.js');
const usuarioModel = require('../Model/usuarioModel.js');
const { validarPasswordContraPolitica, obtenerPoliticaPorSucursal } = require('../Utils/passwordPolicy.js');

//empresas
async function obtenerEmpresas(req, res) {
  try {
    const empresas = await empresaModel.obtenerTodos();
    res.json(empresas);
  } catch (error) { res.status(500).json({ error: error.message }); }
}

async function crearEmpresa(req, res) {
  try {
    const id = await empresaModel.crear(req.body);
    res.status(201).json({ mensaje: 'Empresa creada', id });
  } catch (error) { res.status(500).json({ error: error.message }); }
}

async function actualizarEmpresa(req, res) {
  try {
    await empresaModel.actualizar(req.params.id, req.body);
    res.json({ mensaje: 'Empresa actualizada exitosamente' });
  } catch (error) { res.status(500).json({ error: error.message }); }
}

async function eliminarEmpresa(req, res) {
  try {
    const id = req.params.id;
    await empresaModel.eliminar(id); 
    res.json({ mensaje: 'Empresa eliminada exitosamente' });
  } catch (error) { 
    res.status(500).json({ error: error.message }); 
  }
}

//sucursales
async function obtenerSucursales(req, res) {
  try {
    const { idEmpresa } = req.query;
    const sucursales = idEmpresa 
      ? await sucursalModel.obtenerPorEmpresa(idEmpresa)
      : await sucursalModel.obtenerTodos();
    res.json(sucursales);
  } catch (error) { res.status(500).json({ error: error.message }); }
}

async function crearSucursal(req, res) {
  try {
    const id = await sucursalModel.crear(req.body);
    res.status(201).json({ mensaje: 'Sucursal creada', id });
  } catch (error) { res.status(500).json({ error: error.message }); }
}

async function actualizarSucursal(req, res) {
  try {
    await sucursalModel.actualizar(req.params.id, req.body);
    res.json({ mensaje: 'Sucursal actualizada exitosamente' });
  } catch (error) { res.status(500).json({ error: error.message }); }
}

async function eliminarSucursal(req, res) {
    try {
        await sucursalModel.eliminar(req.params.id);
        res.json({ mensaje: 'Sucursal eliminada' });
    } catch (error) { res.status(500).json({ error: error.message }); }
}

async function obtenerSucursalesPorEmpresa(req, res) {
    try {
        const { id } = req.params;
        const sucursales = await sucursalModel.obtenerPorEmpresa(id);
        res.json(sucursales);
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
}

//generos
async function obtenerGeneros(req, res) {
  try {
    const generos = await generoModel.obtenerTodos();
    res.json(generos);
  } catch (error) { res.status(500).json({ error: error.message }); }
}

async function crearGenero(req, res) {
  try {
    const { Nombre, UsuarioCreacion } = req.body;
    
    // Suponiendo que tu modelo retorna el ID del nuevo registro
    const nuevoId = await generoModel.crear({ Nombre, UsuarioCreacion });
    
    res.status(201).json({ 
        mensaje: 'Género creado exitosamente', 
        id: nuevoId 
    });
  } catch (error) { 
    res.status(500).json({ mensaje: 'Error al crear el género', error: error.message }); 
  }
}

async function actualizarGenero(req, res) {
  try {
    const { id } = req.params;
    const { Nombre, UsuarioModificacion } = req.body;
    
    await generoModel.actualizar(id, { Nombre, UsuarioModificacion });
    
    res.json({ mensaje: 'Género actualizado exitosamente' });
  } catch (error) { 
    res.status(500).json({ mensaje: 'Error al actualizar el género', error: error.message }); 
  }
}

async function eliminarGenero(req, res) {
  try {
    const { id } = req.params;
    
    await generoModel.eliminar(id);
    
    res.json({ mensaje: 'Género eliminado exitosamente' });
  } catch (error) { 
    res.status(500).json({ mensaje: 'Error al eliminar el género', error: error.message }); 
  }
}

//status usuarios
async function obtenerStatusUsuarios(req, res) {
  try {
    const estatus = await statusUsuarioModel.obtenerTodos();
    res.json(estatus);
  } catch (error) { res.status(500).json({ error: error.message }); }
}

async function crearEstatusUsuario(req, res) {
  try {
    const { Nombre, UsuarioCreacion } = req.body; 
    const nuevoId = await statusUsuarioModel.crear({ Nombre, UsuarioCreacion });
    res.status(201).json({ mensaje: 'Estatus creado exitosamente', id: nuevoId });
  } catch (error) { res.status(500).json({ mensaje: 'Error al crear', error: error.message }); }
}

async function actualizarEstatusUsuario(req, res) {
  try {
    const { id } = req.params;
    const { Nombre, UsuarioModificacion } = req.body;
    await statusUsuarioModel.actualizar(id, { Nombre, UsuarioModificacion });
    res.json({ mensaje: 'Estatus actualizado exitosamente' });
  } catch (error) { res.status(500).json({ mensaje: 'Error al actualizar', error: error.message }); }
}

async function eliminarEstatusUsuario(req, res) {
  try {
    const { id } = req.params;
    await statusUsuarioModel.eliminar(id);
    res.json({ mensaje: 'Estatus eliminado exitosamente' });
  } catch (error) { res.status(500).json({ mensaje: 'Error al eliminar', error: error.message }); }
}

//Roles
async function obtenerRoles(req, res) {
  try {
    const roles = await roleModel.obtenerTodos();
    res.json(roles);
  } catch (error) { res.status(500).json({ error: error.message }); }
}

async function crearRol(req, res) {
  try {
    const { Nombre, UsuarioCreacion } = req.body; 
    const nuevoId = await roleModel.crear({ Nombre, UsuarioCreacion });
    res.status(201).json({ mensaje: 'Rol creado exitosamente', id: nuevoId });
  } catch (error) { res.status(500).json({ mensaje: 'Error al crear', error: error.message }); }
}

async function actualizarRol(req, res) {
  try {
    const { id } = req.params;
    const { Nombre, UsuarioModificacion } = req.body;
    await roleModel.actualizar(id, { Nombre, UsuarioModificacion });
    res.json({ mensaje: 'Rol actualizado exitosamente' });
  } catch (error) { res.status(500).json({ mensaje: 'Error al actualizar', error: error.message }); }
}

async function eliminarRol(req, res) {
  try {
    const { id } = req.params;
    await roleModel.eliminar(id);
    res.json({ mensaje: 'Rol eliminado exitosamente' });
  } catch (error) { res.status(500).json({ mensaje: 'Error al eliminar', error: error.message }); }
}

//modulos
async function obtenerModulos(req, res) {
  try {
    const modulos = await moduloModel.obtenerTodos();
    res.json(modulos);
  } catch (error) { res.status(500).json({ error: error.message }); }
}

async function crearModulo(req, res) {
  try {
    // Aquí recibimos Nombre y Orden
    const { Nombre, OrdenMenu, UsuarioCreacion } = req.body; 
    const nuevoId = await moduloModel.crear({ Nombre, OrdenMenu, UsuarioCreacion });
    res.status(201).json({ mensaje: 'Módulo creado exitosamente', id: nuevoId });
  } catch (error) { res.status(500).json({ mensaje: 'Error al crear', error: error.message }); }
}

async function actualizarModulo(req, res) {
  try {
    const { id } = req.params;
    const { Nombre, OrdenMenu, UsuarioModificacion } = req.body;
    await moduloModel.actualizar(id, { Nombre, OrdenMenu, UsuarioModificacion });
    res.json({ mensaje: 'Módulo actualizado exitosamente' });
  } catch (error) { res.status(500).json({ mensaje: 'Error al actualizar', error: error.message }); }
}

async function eliminarModulo(req, res) {
  try {
    const { id } = req.params;
    await moduloModel.eliminar(id);
    res.json({ mensaje: 'Módulo eliminado exitosamente' });
  } catch (error) { res.status(500).json({ mensaje: 'Error al eliminar', error: error.message }); }
}

//Menus
async function obtenerMenus(req, res) {
  try {
    const menus = await menuModel.obtenerTodos();
    res.json(menus);
  } catch (error) { res.status(500).json({ error: error.message }); }
}

async function crearMenu(req, res) {
  try {
    const { IdModulo, Nombre, OrdenMenu, UsuarioCreacion } = req.body;
    const nuevoId = await menuModel.crear({ IdModulo, Nombre, OrdenMenu, UsuarioCreacion });
    res.status(201).json({ mensaje: 'Menú creado exitosamente', id: nuevoId });
  } catch (error) { 
    res.status(500).json({ mensaje: 'Error al crear', error: error.message }); 
  }
}

async function actualizarMenu(req, res) {
  try {
    const { id } = req.params;
    const { IdModulo, Nombre, OrdenMenu, UsuarioModificacion } = req.body;
    await menuModel.actualizar(id, { IdModulo, Nombre, OrdenMenu, UsuarioModificacion });
    res.json({ mensaje: 'Menú actualizado exitosamente' });
  } catch (error) { 
    res.status(500).json({ mensaje: 'Error al actualizar', error: error.message }); 
  }
}

async function eliminarMenu(req, res) {
  try {
    const { id } = req.params;
    await menuModel.eliminar(id);
    res.json({ mensaje: 'Menú eliminado exitosamente' });
  } catch (error) { 
    res.status(500).json({ mensaje: 'Error al eliminar', error: error.message }); 
  }
}

// opciones
async function obtenerOpciones(req, res) {
  try {
    const opciones = await opcionModel.obtenerTodos();
    res.json(opciones);
  } catch (error) { res.status(500).json({ error: error.message }); }
}

async function crearOpcion(req, res) {
  try {
    const { IdMenu, Nombre, Pagina, OrdenMenu, UsuarioCreacion } = req.body;
    const nuevoId = await opcionModel.crear({ IdMenu, Nombre, Pagina, OrdenMenu, UsuarioCreacion });
    res.status(201).json({ mensaje: 'Opción creada', id: nuevoId });
  } catch (error) { res.status(500).json({ mensaje: 'Error al crear', error: error.message }); }
}

async function actualizarOpcion(req, res) {
  try {
    const { id } = req.params;
    const { IdMenu, Nombre, Pagina, OrdenMenu, UsuarioModificacion } = req.body;
    await opcionModel.actualizar(id, { IdMenu, Nombre, Pagina, OrdenMenu, UsuarioModificacion });
    res.json({ mensaje: 'Opción actualizada' });
  } catch (error) { res.status(500).json({ mensaje: 'Error al actualizar', error: error.message }); }
}

async function eliminarOpcion(req, res) {
  try {
    const { id } = req.params;
    await opcionModel.eliminar(id);
    res.json({ mensaje: 'Opción eliminada' });
  } catch (error) { res.status(500).json({ mensaje: 'Error al eliminar', error: error.message }); }
}

// --- USUARIOS ---
async function obtenerUsuarios(req, res) {
    try {
        const usuarios = await usuarioModel.obtenerTodos();
        res.json(usuarios);
    } catch (error) { res.status(500).json({ error: error.message }); }
}

// --- USUARIOS ---
async function crearUsuario(req, res) {
  try {
    const datosUsuario = req.body;

    if (datosUsuario.TelefonoMovil && datosUsuario.TelefonoMovil.length > 30) {
      return res.status(400).json({ mensaje: 'El teléfono móvil no puede exceder 30 caracteres.' });
    }

    const politica = await obtenerPoliticaPorSucursal(datosUsuario.IdSucursal);
    const resultado = validarPasswordContraPolitica(datosUsuario.Password || '', politica);
    if (!resultado.valido) {
      return res.status(400).json({ mensaje: resultado.mensaje });
    }

    // Llama directamente a la función existente en usuarioModel.js
    await usuarioModel.crearUsuario(datosUsuario);
    res.status(201).json({ mensaje: 'Usuario creado exitosamente' });
  } catch (error) { 
    res.status(500).json({ mensaje: 'Error al crear usuario', error: error.message }); 
  }
}

async function actualizarUsuario(req, res) {
  try {
    const { id } = req.params;
    const datosUsuario = req.body;

    if (datosUsuario.TelefonoMovil && datosUsuario.TelefonoMovil.length > 30) {
      return res.status(400).json({ mensaje: 'El teléfono móvil no puede exceder 30 caracteres.' });
    }

    if (datosUsuario.Password) {
      const politica = await obtenerPoliticaPorSucursal(datosUsuario.IdSucursal);
      const resultado = validarPasswordContraPolitica(datosUsuario.Password, politica);
      if (!resultado.valido) {
        return res.status(400).json({ mensaje: resultado.mensaje });
      }
    }

    await usuarioModel.actualizar(id, datosUsuario);

    if (datosUsuario.Password) {
      await usuarioModel.actualizarPasswordAdmin(id, datosUsuario.Password, datosUsuario.UsuarioModificacion);
    }

    res.json({ mensaje: 'Usuario actualizado exitosamente' });
  } catch (error) { 
    res.status(500).json({ mensaje: 'Error al actualizar usuario', error: error.message }); 
  }
}

async function eliminarUsuario(req, res) {
    try {
        const { id } = req.params;
        await usuarioModel.eliminar(id);
        res.json({ mensaje: 'Usuario eliminado exitosamente' });
    } catch (error) { 
        res.status(500).json({ mensaje: 'Error al eliminar', error: error.message }); 
    }
}

module.exports = {
  obtenerEmpresas, crearEmpresa, actualizarEmpresa, eliminarEmpresa,
  obtenerSucursales, crearSucursal, actualizarSucursal, eliminarSucursal, obtenerSucursalesPorEmpresa,
  obtenerGeneros, crearGenero, actualizarGenero, eliminarGenero,
  obtenerRoles, crearRol, actualizarRol, eliminarRol,
  obtenerStatusUsuarios, crearEstatusUsuario, actualizarEstatusUsuario, eliminarEstatusUsuario,
  obtenerModulos, crearModulo, actualizarModulo, eliminarModulo,
  obtenerMenus, crearMenu, actualizarMenu, eliminarMenu,
  obtenerOpciones, crearOpcion, actualizarOpcion, eliminarOpcion,
  obtenerUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario
};