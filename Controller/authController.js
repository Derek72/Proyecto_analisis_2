const usuarioModel = require('../Model/usuarioModel.js');
const bitacoraModel = require('../Model/bitacoraModel.js');
const bcrypt = require('bcrypt');

async function login(req, res) {
  const { Username, Password } = req.body;
  const ipOrigen = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const navegador = req.headers['user-agent'];

  if (!Username || !Password) {
    return res.status(400).json({ mensaje: 'Por favor ingresa usuario y contraseña' });
  }

  try {
    const usuario = await usuarioModel.obtenerPorId(Username);

    if (!usuario) {
      return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
    }

    if (usuario.IdStatusUsuario === 3) {
      const fechaBloqueo = new Date(usuario.FechaModificacion);
      const fechaActual = new Date();
      const diasTranscurridos = (fechaActual - fechaBloqueo) / (1000 * 3600 * 24);

      if (diasTranscurridos >= 5) {
        await bitacoraModel.registrarAcceso({
          IdUsuario: usuario.IdUsuario,
          IdTipoAcceso: 3,
          DireccionIp: ipOrigen,
          HttpUserAgent: navegador,
          Acceso: 'Cumplió los 5 días de bloqueo. Requiere desbloqueo por Administrador.'
        });

        return res.status(403).json({ 
          mensaje: 'Has cumplido los 5 días de sanción. Por favor contacta al Administrador para habilitar tu cuenta.' 
        });
      } else {
        const diasRestantes = Math.ceil(5 - diasTranscurridos);
        return res.status(403).json({ 
          mensaje: `Cuenta bloqueada. Te faltan ${diasRestantes} día(s) para cumplir el periodo de sanción.` 
        });
      }
    }

    const passwordValida = await bcrypt.compare(Password, usuario.Password);
    if (!passwordValida) {
      const intentos = await usuarioModel.registrarIntentoFallido(Username, usuario.IntentosDeAcceso || 0);

      if (intentos >= 3) {

        await usuarioModel.bloquearUsuario(Username, 3);
        
        await bitacoraModel.registrarAcceso({
          IdUsuario: usuario.IdUsuario,
          IdTipoAcceso: 3,
          DireccionIp: ipOrigen,
          HttpUserAgent: navegador,
          Acceso: 'Cuenta bloqueada automáticamente tras alcanzar 3 intentos fallidos.'
        });

        return res.status(403).json({ 
          mensaje: 'Has superado el límite de 3 intentos fallidos. Tu cuenta ha sido bloqueada.' 
        });
      } else {

        await bitacoraModel.registrarAcceso({
          IdUsuario: usuario.IdUsuario,
          IdTipoAcceso: 2,
          DireccionIp: ipOrigen,
          HttpUserAgent: navegador,
          Acceso: `Contraseña incorrecta. Intento ${intentos} de 3.`
        });

        return res.status(401).json({ 
          mensaje: `Contraseña incorrecta. Te quedan ${3 - intentos} intento(s) antes de bloquearte.` 
        });
      }
    }

    await usuarioModel.resetearIntentosYEstado(Username, 1);

    await bitacoraModel.registrarAcceso({
      IdUsuario: usuario.IdUsuario,
      IdTipoAcceso: 1,
      DireccionIp: ipOrigen,
      HttpUserAgent: navegador,
      Acceso: 'Inicio de sesión exitoso'
    });

    res.json({
      mensaje: '¡Inicio de sesión exitoso!',
      usuario: {
        id: usuario.IdUsuario,
        nombre: `${usuario.Nombre} ${usuario.Apellido}`,
        correo: usuario.CorreoElectronico,
        rol: usuario.NombreRole
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { login };