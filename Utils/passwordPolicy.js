const empresaModel = require('../Model/empresaModel.js');
const sucursalModel = require('../Model/sucursalModel.js');

function validarPasswordContraPolitica(password, politica) {
  if (!politica) {
    
    return { valido: true, mensaje: '' };
  }

  const errores = [];

  const largoMin = politica.PasswordLargo || 0;
  if (password.length < largoMin) {
    errores.push(`al menos ${largoMin} caracteres`);
  }

  const minMayus = politica.PasswordCantidadMayusculas || 0;
  const mayus = (password.match(/[A-ZÁÉÍÓÚÑ]/g) || []).length;
  if (mayus < minMayus) {
    errores.push(`al menos ${minMayus} mayúscula(s)`);
  }

  const minMinus = politica.PasswordCantidadMinusculas || 0;
  const minus = (password.match(/[a-záéíóúñ]/g) || []).length;
  if (minus < minMinus) {
    errores.push(`al menos ${minMinus} minúscula(s)`);
  }

  const minNumeros = politica.PasswordCantidadNumeros || 0;
  const numeros = (password.match(/[0-9]/g) || []).length;
  if (numeros < minNumeros) {
    errores.push(`al menos ${minNumeros} número(s)`);
  }

  const minEspeciales = politica.PasswordCantidadCaracteresEspeciales || 0;
  const especiales = (password.match(/[^A-Za-z0-9]/g) || []).length;
  if (especiales < minEspeciales) {
    errores.push(`al menos ${minEspeciales} carácter(es) especial(es)`);
  }

  if (errores.length > 0) {
    return {
      valido: false,
      mensaje: `La contraseña no cumple la política de la empresa: requiere ${errores.join(', ')}.`
    };
  }

  return { valido: true, mensaje: '' };
}

async function obtenerPoliticaPorSucursal(idSucursal) {
  if (!idSucursal) return null;
  const sucursal = await sucursalModel.obtenerPorId(idSucursal);
  if (!sucursal) return null;
  const politica = await empresaModel.obtenerPoliticasPassword(sucursal.IdEmpresa);
  return politica || null;
}

module.exports = { validarPasswordContraPolitica, obtenerPoliticaPorSucursal };
