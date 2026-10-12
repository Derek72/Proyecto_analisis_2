const roleOpcionModel = require('../Model/roleOpcionModel.js');

function verificarPermisos(nombreOpcion, tipoPermiso) {
  return async (req, res, next) => {
    try {
      const idRole = req.headers['x-role-id'];

      if (!idRole) {
        return res.status(401).json({ 
          mensaje: 'No autorizado: Falta identificar el rol del usuario en la petición (header x-role-id).' 
        });
      }

      const tienePermiso = await roleOpcionModel.verificarPermiso(idRole, nombreOpcion, tipoPermiso);

      if (tienePermiso === 1) {
        next();
      } else {
        return res.status(403).json({ 
          mensaje: `Acceso denegado: Tu rol no tiene permiso para ${tipoPermiso} en la opción ${nombreOpcion}.` 
        });
      }

    } catch (error) {
      console.error("Error en el middleware de autorización:", error);
      res.status(500).json({ error: 'Error interno al verificar permisos.' });
    }
  };
}

module.exports = { verificarPermisos };