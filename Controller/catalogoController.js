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
const estadoCivilModel = require('../Model/estadoCivilModel.js');
const statusEmpleadoModel = require('../Model/statusEmpleadoModel.js');
const flujoStatusEmpleadoModel = require('../Model/flujoStatusEmpleadoModel.js');
const tipoDocumentoModel = require('../Model/tipoDocumentoModel.js');
const departamentoModel = require('../Model/departamentoModel.js');
const puestoModel = require('../Model/puestoModel.js');
const personaModel = require('../Model/personaModel.js');
const documentoPersonaModel = require('../Model/documentoPersonaModel.js');
const bancoModel = require('../Model/bancoModel.js');

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
// --- ESTADOS CIVILES ---
async function obtenerEstadosCiviles(req, res) {
    try {
        const estadosCiviles = await estadoCivilModel.obtenerTodos();
        res.json(estadosCiviles);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener estados civiles', error: error.message });
    }
}

// --- catalogoController.js ---

async function crearEstadoCivil(req, res) {
    try {
        const { Nombre, UsuarioCreacion } = req.body;
        // Agrega llaves {} para enviarlo como el objeto 'datos' que espera el modelo
        await estadoCivilModel.crear({ Nombre, UsuarioCreacion }); 
        res.status(201).json({ mensaje: 'Estado civil creado exitosamente' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al crear estado civil', error: error.message });
    }
}

async function actualizarEstadoCivil(req, res) {
    try {
        const { id } = req.params;
        const { Nombre, UsuarioModificacion } = req.body;
        // Agrega llaves {} para el segundo parámetro
        await estadoCivilModel.actualizar(id, { Nombre, UsuarioModificacion }); 
        res.json({ mensaje: 'Estado civil actualizado exitosamente' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al actualizar estado civil', error: error.message });
    }
}

async function eliminarEstadoCivil(req, res) {
    try {
        const { id } = req.params;
        await estadoCivilModel.eliminar(id);
        res.json({ mensaje: 'Estado civil eliminado exitosamente' });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ mensaje: 'No se puede eliminar porque este estado civil ya está asignado a una persona.' });
        }
        res.status(500).json({ mensaje: 'Error al eliminar estado civil', error: error.message });
    }
}

// --- STATUS EMPLEADOS ---
async function obtenerStatusEmpleados(req, res) {
    try {
        const status = await statusEmpleadoModel.obtenerTodos();
        res.json(status);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener status de empleados', error: error.message });
    }
}

async function crearStatusEmpleado(req, res) {
    try {
        const { Nombre, UsuarioCreacion } = req.body;
        await statusEmpleadoModel.crear({ Nombre, UsuarioCreacion });
        res.status(201).json({ mensaje: 'Status de empleado creado exitosamente' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al crear status de empleado', error: error.message });
    }
}

async function actualizarStatusEmpleado(req, res) {
    try {
        const { id } = req.params;
        const { Nombre, UsuarioModificacion } = req.body;
        await statusEmpleadoModel.actualizar(id, { Nombre, UsuarioModificacion });
        res.json({ mensaje: 'Status de empleado actualizado exitosamente' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al actualizar status de empleado', error: error.message });
    }
}

async function eliminarStatusEmpleado(req, res) {
    try {
        const { id } = req.params;
        await statusEmpleadoModel.eliminar(id);
        res.json({ mensaje: 'Status de empleado eliminado exitosamente' });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ mensaje: 'No se puede eliminar porque este status ya está asignado a un empleado o a un flujo.' });
        }
        res.status(500).json({ mensaje: 'Error al eliminar status de empleado', error: error.message });
    }
}

// --- FLUJO STATUS EMPLEADO ---
// --- 2. Funciones para Flujo Status Empleado ---
async function obtenerFlujosStatus(req, res) {
    try {
        const flujos = await flujoStatusEmpleadoModel.obtenerTodos();
        res.json(flujos);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener los flujos de status', error: error.message });
    }
}

async function crearFlujoStatus(req, res) {
    try {
        const { IdStatusActual, IdStatusNuevo, NombreEvento, UsuarioCreacion } = req.body;

        if (IdStatusActual === IdStatusNuevo) {
            return res.status(400).json({ mensaje: 'El status actual y el nuevo no pueden ser el mismo.' });
        }

        await flujoStatusEmpleadoModel.crear({ IdStatusActual, IdStatusNuevo, NombreEvento, UsuarioCreacion });
        res.status(201).json({ mensaje: 'Flujo de status creado exitosamente' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ mensaje: 'Esta transición entre estados ya se encuentra registrada.' });
        }
        res.status(500).json({ mensaje: 'Error al crear flujo de status', error: error.message });
    }
}

async function actualizarFlujoStatus(req, res) {
    try {
        const { idActual, idNuevo } = req.params;
        const { NombreEvento, UsuarioModificacion } = req.body;
        await flujoStatusEmpleadoModel.actualizar(idActual, idNuevo, { NombreEvento, UsuarioModificacion });
        res.json({ mensaje: 'Flujo de status actualizado exitosamente' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al actualizar flujo de status', error: error.message });
    }
}

async function eliminarFlujoStatus(req, res) {
    try {
        const { idActual, idNuevo } = req.params;
        await flujoStatusEmpleadoModel.eliminar(idActual, idNuevo);
        res.json({ mensaje: 'Flujo de status eliminado exitosamente' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al eliminar flujo de status', error: error.message });
    }
}

// Tipo de Documento
async function obtenerTiposDocumentos(req, res) {
    try {
        const tipos = await tipoDocumentoModel.obtenerTodos();
        res.json(tipos);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener los tipos de documentos', error: error.message });
    }
}

async function crearTipoDocumento(req, res) {
    try {
        const { Nombre, UsuarioCreacion } = req.body;
        await tipoDocumentoModel.crear({ Nombre, UsuarioCreacion });
        res.status(201).json({ mensaje: 'Tipo de documento creado exitosamente' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al crear el tipo de documento', error: error.message });
    }
}

async function actualizarTipoDocumento(req, res) {
    try {
        const { id } = req.params;
        const { Nombre, UsuarioModificacion } = req.body;
        await tipoDocumentoModel.actualizar(id, { Nombre, UsuarioModificacion });
        res.json({ mensaje: 'Tipo de documento actualizado exitosamente' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al actualizar el tipo de documento', error: error.message });
    }
}

async function eliminarTipoDocumento(req, res) {
    try {
        const { id } = req.params;
        await tipoDocumentoModel.eliminar(id);
        res.json({ mensaje: 'Tipo de documento eliminado exitosamente' });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ mensaje: 'No se puede eliminar porque ya está asignado a una persona.' });
        }
        res.status(500).json({ mensaje: 'Error al eliminar el tipo de documento', error: error.message });
    }
}

// --- 2. Funciones para Departamentos ---
async function obtenerDepartamentos(req, res) {
    try {
        const departamentos = await departamentoModel.obtenerTodos();
        res.json(departamentos);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener los departamentos', error: error.message });
    }
}

async function crearDepartamento(req, res) {
    try {
        const { Nombre, IdEmpresa, UsuarioCreacion } = req.body;
        await departamentoModel.crear({ Nombre, IdEmpresa, UsuarioCreacion });
        res.status(201).json({ mensaje: 'Departamento creado exitosamente' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al crear el departamento', error: error.message });
    }
}

async function actualizarDepartamento(req, res) {
    try {
        const { id } = req.params;
        const { Nombre, IdEmpresa, UsuarioModificacion } = req.body;
        await departamentoModel.actualizar(id, { Nombre, IdEmpresa, UsuarioModificacion });
        res.json({ mensaje: 'Departamento actualizado exitosamente' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al actualizar el departamento', error: error.message });
    }
}

async function eliminarDepartamento(req, res) {
    try {
        const { id } = req.params;
        await departamentoModel.eliminar(id);
        res.json({ mensaje: 'Departamento eliminado exitosamente' });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ mensaje: 'No se puede eliminar porque este departamento ya está asignado a un puesto.' });
        }
        res.status(500).json({ mensaje: 'Error al eliminar el departamento', error: error.message });
    }
}

// --- 2. Funciones para Puestos ---
async function obtenerPuestos(req, res) {
    try {
        const puestos = await puestoModel.obtenerTodos();
        res.json(puestos);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener los puestos', error: error.message });
    }
}

async function crearPuesto(req, res) {
    try {
        const { Nombre, IdDepartamento, UsuarioCreacion } = req.body;
        await puestoModel.crear({ Nombre, IdDepartamento, UsuarioCreacion });
        res.status(201).json({ mensaje: 'Puesto creado exitosamente' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al crear el puesto', error: error.message });
    }
}

async function actualizarPuesto(req, res) {
    try {
        const { id } = req.params;
        const { Nombre, IdDepartamento, UsuarioModificacion } = req.body;
        await puestoModel.actualizar(id, { Nombre, IdDepartamento, UsuarioModificacion });
        res.json({ mensaje: 'Puesto actualizado exitosamente' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al actualizar el puesto', error: error.message });
    }
}

async function eliminarPuesto(req, res) {
    try {
        const { id } = req.params;
        await puestoModel.eliminar(id);
        res.json({ mensaje: 'Puesto eliminado exitosamente' });
    } catch (error) {
        // Validación por si el puesto ya está asignado a un empleado
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ mensaje: 'No se puede eliminar porque este puesto ya está asignado a un empleado o persona.' });
        }
        res.status(500).json({ mensaje: 'Error al eliminar el puesto', error: error.message });
    }
}

// --- 7. Funciones para Personas ---
async function obtenerPersonas(req, res) {
    try {
        const personas = await personaModel.obtenerTodos();
        res.json(personas);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener las personas', error: error.message });
    }
}

async function crearPersona(req, res) {
    try {
        const { Nombre, Apellido, FechaNacimiento, IdGenero, Direccion, Telefono, CorreoElectronico, IdEstadoCivil, UsuarioCreacion } = req.body;
        await personaModel.crear({ Nombre, Apellido, FechaNacimiento, IdGenero, Direccion, Telefono, CorreoElectronico, IdEstadoCivil, UsuarioCreacion });
        res.status(201).json({ mensaje: 'Persona creada exitosamente' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al crear la persona', error: error.message });
    }
}

async function actualizarPersona(req, res) {
    try {
        const { id } = req.params;
        const { Nombre, Apellido, FechaNacimiento, IdGenero, Direccion, Telefono, CorreoElectronico, IdEstadoCivil, UsuarioModificacion } = req.body;
        await personaModel.actualizar(id, { Nombre, Apellido, FechaNacimiento, IdGenero, Direccion, Telefono, CorreoElectronico, IdEstadoCivil, UsuarioModificacion });
        res.json({ mensaje: 'Persona actualizada exitosamente' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al actualizar la persona', error: error.message });
    }
}

async function eliminarPersona(req, res) {
    try {
        const { id } = req.params;
        await personaModel.eliminar(id);
        res.json({ mensaje: 'Persona eliminada exitosamente' });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ mensaje: 'No se puede eliminar porque esta persona ya tiene documentos o un empleado asociado.' });
        }
        res.status(500).json({ mensaje: 'Error al eliminar la persona', error: error.message });
    }
}

// --- 8. Funciones para Documentos de Personas ---
async function obtenerDocumentosPersona(req, res) {
    try {
        const documentos = await documentoPersonaModel.obtenerTodos();
        res.json(documentos);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener los documentos de personas', error: error.message });
    }
}

async function crearDocumentoPersona(req, res) {
    try {
        const { IdPersona, IdTipoDocumento, NoDocumento, UsuarioCreacion } = req.body;
        await documentoPersonaModel.crear({ IdPersona, IdTipoDocumento, NoDocumento, UsuarioCreacion });
        res.status(201).json({ mensaje: 'Documento de persona creado exitosamente' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ mensaje: 'Esta persona ya tiene registrado un documento de ese tipo.' });
        }
        res.status(500).json({ mensaje: 'Error al crear el documento de persona', error: error.message });
    }
}

async function actualizarDocumentoPersona(req, res) {
    try {
        const { idPersona, idTipoDocumento } = req.params;
        const { NoDocumento, UsuarioModificacion } = req.body;
        await documentoPersonaModel.actualizar(idPersona, idTipoDocumento, { NoDocumento, UsuarioModificacion });
        res.json({ mensaje: 'Documento de persona actualizado exitosamente' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al actualizar el documento de persona', error: error.message });
    }
}

async function eliminarDocumentoPersona(req, res) {
    try {
        const { idPersona, idTipoDocumento } = req.params;
        await documentoPersonaModel.eliminar(idPersona, idTipoDocumento);
        res.json({ mensaje: 'Documento de persona eliminado exitosamente' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al eliminar el documento de persona', error: error.message });
    }
}

// --- 9. Funciones para Bancos ---
async function obtenerBancos(req, res) {
    try {
        const bancos = await bancoModel.obtenerTodos();
        res.json(bancos);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener los bancos', error: error.message });
    }
}

async function crearBanco(req, res) {
    try {
        const { Nombre, UsuarioCreacion } = req.body;
        await bancoModel.crear({ Nombre, UsuarioCreacion });
        res.status(201).json({ mensaje: 'Banco creado exitosamente' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al crear el banco', error: error.message });
    }
}

async function actualizarBanco(req, res) {
    try {
        const { id } = req.params;
        const { Nombre, UsuarioModificacion } = req.body;
        await bancoModel.actualizar(id, { Nombre, UsuarioModificacion });
        res.json({ mensaje: 'Banco actualizado exitosamente' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al actualizar el banco', error: error.message });
    }
}

async function eliminarBanco(req, res) {
    try {
        const { id } = req.params;
        await bancoModel.eliminar(id);
        res.json({ mensaje: 'Banco eliminado exitosamente' });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ mensaje: 'No se puede eliminar porque este banco ya está asignado a una cuenta bancaria de empleado.' });
        }
        res.status(500).json({ mensaje: 'Error al eliminar el banco', error: error.message });
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
  obtenerUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario,
  obtenerEstadosCiviles, crearEstadoCivil, actualizarEstadoCivil, eliminarEstadoCivil,
  obtenerStatusEmpleados, crearStatusEmpleado, actualizarStatusEmpleado, eliminarStatusEmpleado,
  obtenerFlujosStatus, crearFlujoStatus, actualizarFlujoStatus, eliminarFlujoStatus,
  obtenerTiposDocumentos, crearTipoDocumento, actualizarTipoDocumento, eliminarTipoDocumento,
  obtenerDepartamentos, crearDepartamento, actualizarDepartamento, eliminarDepartamento,
  obtenerPuestos, crearPuesto, actualizarPuesto, eliminarPuesto,
  obtenerPersonas, crearPersona, actualizarPersona, eliminarPersona,
  obtenerDocumentosPersona, crearDocumentoPersona, actualizarDocumentoPersona, eliminarDocumentoPersona,
  obtenerBancos, crearBanco, actualizarBanco, eliminarBanco
};