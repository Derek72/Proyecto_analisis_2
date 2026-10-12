const empleadoModel = require('../Model/empleadoModel.js');
const cuentaModel = require('../Model/cuentaBancariaEmpleadoModel.js');
const inasistenciaModel = require('../Model/inasistenciaModel.js');
const planillaModel = require('../Model/planillaModel.js');

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const esNumeroNoNegativo = (v) => v !== '' && v !== null && v !== undefined && !isNaN(Number(v)) && Number(v) >= 0;

function errorServidor(res, mensaje, error) {
  console.error(mensaje, error);
  return res.status(500).json({ mensaje, error: error.message });
}

function validarEmpleado(b) {
  if (!b.IdPersona || !b.IdSucursal || !b.IdPuesto || !b.IdStatusEmpleado) return 'Persona, sucursal, puesto y status son obligatorios.';
  if (!FECHA_RE.test(b.FechaContratacion || '')) return 'La fecha de contratación no es válida.';
  if (!esNumeroNoNegativo(b.IngresoSueldoBase) || Number(b.IngresoSueldoBase) <= 0) return 'El sueldo base debe ser mayor a cero.';
  const otros = ['IngresoBonificacionDecreto', 'IngresoOtrosIngresos', 'DescuentoIgss', 'DescuentoIsr', 'DescuentoInasistencias'];
  for (const c of otros) if (!esNumeroNoNegativo(b[c])) return 'Los montos de ingresos y descuentos deben ser números mayores o iguales a cero.';
  return null;
}

async function obtenerEmpleados(req, res) {
  try { res.json(await empleadoModel.obtenerTodos()); }
  catch (error) { errorServidor(res, 'Error al obtener los empleados', error); }
}

async function obtenerCombosEmpleado(req, res) {
  try { res.json(await empleadoModel.obtenerCombos()); }
  catch (error) { errorServidor(res, 'Error al cargar las listas de empleados', error); }
}

async function crearEmpleado(req, res) {
  try {
    const msg = validarEmpleado(req.body);
    if (msg) return res.status(400).json({ mensaje: msg });
    if (await empleadoModel.personaYaEsEmpleado(req.body.IdPersona)) {
      return res.status(400).json({ mensaje: 'Esta persona ya está registrada como empleado.' });
    }
    await empleadoModel.crear(req.body);
    res.status(201).json({ mensaje: 'Empleado creado exitosamente' });
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ mensaje: 'Persona, sucursal, puesto o status no válidos.' });
    errorServidor(res, 'Error al crear el empleado', error);
  }
}

async function actualizarEmpleado(req, res) {
  try {
    const { id } = req.params;
    const msg = validarEmpleado(req.body);
    if (msg) return res.status(400).json({ mensaje: msg });

    const actual = await empleadoModel.obtenerPorId(id);
    if (!actual) return res.status(404).json({ mensaje: 'El empleado no existe.' });

    if (await empleadoModel.personaYaEsEmpleado(req.body.IdPersona, id)) {
      return res.status(400).json({ mensaje: 'Esta persona ya está registrada como empleado.' });
    }

    const idActual = Number(actual.IdStatusEmpleado);
    const idNuevo = Number(req.body.IdStatusEmpleado);
    if (idActual !== idNuevo && !(await empleadoModel.flujoPermitido(idActual, idNuevo))) {
      return res.status(400).json({
        mensaje: `El cambio de status de "${actual.NombreStatus}" al nuevo status no está permitido en Flujos Status Empleado.`
      });
    }

    await empleadoModel.actualizar(id, req.body);
    res.json({ mensaje: 'Empleado actualizado exitosamente' });
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ mensaje: 'Persona, sucursal, puesto o status no válidos.' });
    errorServidor(res, 'Error al actualizar el empleado', error);
  }
}

async function eliminarEmpleado(req, res) {
  try {
    await empleadoModel.eliminar(req.params.id);
    res.json({ mensaje: 'Empleado eliminado exitosamente' });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ mensaje: 'No se puede eliminar porque el empleado tiene cuentas bancarias, inasistencias o planillas asociadas.' });
    }
    errorServidor(res, 'Error al eliminar el empleado', error);
  }
}

function validarCuenta(b) {
  if (!b.IdEmpleado || !b.IdBanco) return 'Empleado y banco son obligatorios.';
  if (!b.NumeroDeCuenta || !String(b.NumeroDeCuenta).trim()) return 'El número de cuenta es obligatorio.';
  if (String(b.Activa) !== '0' && String(b.Activa) !== '1') return 'El indicador de cuenta activa no es válido.';
  return null;
}

async function obtenerCuentas(req, res) {
  try { res.json(await cuentaModel.obtenerTodos()); }
  catch (error) { errorServidor(res, 'Error al obtener las cuentas bancarias', error); }
}

async function obtenerCombosCuenta(req, res) {
  try { res.json(await cuentaModel.obtenerCombos()); }
  catch (error) { errorServidor(res, 'Error al cargar las listas de cuentas bancarias', error); }
}

async function crearCuenta(req, res) {
  try {
    const msg = validarCuenta(req.body);
    if (msg) return res.status(400).json({ mensaje: msg });
    req.body.NumeroDeCuenta = String(req.body.NumeroDeCuenta).trim();
    if (await cuentaModel.existeNumeroEnBanco(req.body.IdBanco, req.body.NumeroDeCuenta)) {
      return res.status(400).json({ mensaje: 'Ya existe una cuenta con ese número en el banco seleccionado.' });
    }
    await cuentaModel.crear(req.body);
    res.status(201).json({ mensaje: 'Cuenta bancaria creada exitosamente' });
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ mensaje: 'Empleado o banco no válidos.' });
    errorServidor(res, 'Error al crear la cuenta bancaria', error);
  }
}

async function actualizarCuenta(req, res) {
  try {
    const { id } = req.params;
    const msg = validarCuenta(req.body);
    if (msg) return res.status(400).json({ mensaje: msg });
    req.body.NumeroDeCuenta = String(req.body.NumeroDeCuenta).trim();
    if (await cuentaModel.existeNumeroEnBanco(req.body.IdBanco, req.body.NumeroDeCuenta, id)) {
      return res.status(400).json({ mensaje: 'Ya existe una cuenta con ese número en el banco seleccionado.' });
    }
    await cuentaModel.actualizar(id, req.body);
    res.json({ mensaje: 'Cuenta bancaria actualizada exitosamente' });
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ mensaje: 'Empleado o banco no válidos.' });
    errorServidor(res, 'Error al actualizar la cuenta bancaria', error);
  }
}

async function eliminarCuenta(req, res) {
  try {
    await cuentaModel.eliminar(req.params.id);
    res.json({ mensaje: 'Cuenta bancaria eliminada exitosamente' });
  } catch (error) { errorServidor(res, 'Error al eliminar la cuenta bancaria', error); }
}

/* =================== 12. INASISTENCIAS DE EMPLEADOS =================== */

function validarInasistencia(b) {
  if (!b.IdEmpleado) return 'El empleado es obligatorio.';
  if (!FECHA_RE.test(b.FechaInicial || '') || !FECHA_RE.test(b.FechaFinal || '')) return 'Las fechas inicial y final son obligatorias.';
  if (b.FechaFinal < b.FechaInicial) return 'La fecha final no puede ser anterior a la fecha inicial.';
  if (!b.MotivoInasistencia || !String(b.MotivoInasistencia).trim()) return 'El motivo de la inasistencia es obligatorio.';
  if (String(b.MotivoInasistencia).length > 300) return 'El motivo no puede superar los 300 caracteres.';
  return null;
}

async function obtenerInasistencias(req, res) {
  try { res.json(await inasistenciaModel.obtenerTodos()); }
  catch (error) { errorServidor(res, 'Error al obtener las inasistencias', error); }
}

async function obtenerEmpleadosComboInasistencia(req, res) {
  try { res.json(await inasistenciaModel.obtenerEmpleadosCombo()); }
  catch (error) { errorServidor(res, 'Error al cargar los empleados', error); }
}

async function crearInasistencia(req, res) {
  try {
    const msg = validarInasistencia(req.body);
    if (msg) return res.status(400).json({ mensaje: msg });
    if (await inasistenciaModel.existeTraslape(req.body.IdEmpleado, req.body.FechaInicial, req.body.FechaFinal)) {
      return res.status(400).json({ mensaje: 'El empleado ya tiene una inasistencia registrada que se traslapa con esas fechas.' });
    }
    await inasistenciaModel.crear({
      ...req.body,
      FechaInicial: `${req.body.FechaInicial} 00:00:00`,
      FechaFinal: `${req.body.FechaFinal} 00:00:00`
    });
    res.status(201).json({ mensaje: 'Inasistencia registrada exitosamente' });
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ mensaje: 'El empleado seleccionado no es válido.' });
    errorServidor(res, 'Error al registrar la inasistencia', error);
  }
}

async function actualizarInasistencia(req, res) {
  try {
    const { id } = req.params;
    const actual = await inasistenciaModel.obtenerPorId(id);
    if (!actual) return res.status(404).json({ mensaje: 'La inasistencia no existe.' });
    if (actual.FechaProcesado) return res.status(400).json({ mensaje: 'La inasistencia ya fue procesada en una planilla y no se puede modificar.' });

    const msg = validarInasistencia(req.body);
    if (msg) return res.status(400).json({ mensaje: msg });
    if (await inasistenciaModel.existeTraslape(req.body.IdEmpleado, req.body.FechaInicial, req.body.FechaFinal, id)) {
      return res.status(400).json({ mensaje: 'El empleado ya tiene una inasistencia registrada que se traslapa con esas fechas.' });
    }
    await inasistenciaModel.actualizar(id, {
      ...req.body,
      FechaInicial: `${req.body.FechaInicial} 00:00:00`,
      FechaFinal: `${req.body.FechaFinal} 00:00:00`
    });
    res.json({ mensaje: 'Inasistencia actualizada exitosamente' });
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ mensaje: 'El empleado seleccionado no es válido.' });
    errorServidor(res, 'Error al actualizar la inasistencia', error);
  }
}

async function eliminarInasistencia(req, res) {
  try {
    const actual = await inasistenciaModel.obtenerPorId(req.params.id);
    if (actual && actual.FechaProcesado) {
      return res.status(400).json({ mensaje: 'La inasistencia ya fue procesada en una planilla y no se puede eliminar.' });
    }
    await inasistenciaModel.eliminar(req.params.id);
    res.json({ mensaje: 'Inasistencia eliminada exitosamente' });
  } catch (error) { errorServidor(res, 'Error al eliminar la inasistencia', error); }
}

async function obtenerPeriodos(req, res) {
  try { res.json(await planillaModel.obtenerPeriodos()); }
  catch (error) { errorServidor(res, 'Error al obtener los períodos de planilla', error); }
}

async function obtenerResultadoPlanilla(req, res) {
  try {
    const resultado = await planillaModel.obtenerResultado(req.params.anio, req.params.mes);
    if (!resultado) return res.status(404).json({ mensaje: 'Este período aún no ha sido procesado.' });
    res.json(resultado);
  } catch (error) { errorServidor(res, 'Error al obtener el resultado de la planilla', error); }
}

async function calcularPlanilla(req, res) {
  try {
    const { Anio, Mes, Usuario } = req.body;
    if (!Anio || !Mes) return res.status(400).json({ mensaje: 'Debe seleccionar un período.' });
    const resumen = await planillaModel.calcularPlanilla(Number(Anio), Number(Mes), Usuario || 'system');
    res.status(201).json({ mensaje: 'Planilla calculada exitosamente', resumen });
  } catch (error) {
    if (error.codigoNegocio === 'YA_PROCESADA') return res.status(409).json({ mensaje: error.message });
    if (error.codigoNegocio === 'PERIODO_NO_EXISTE') return res.status(404).json({ mensaje: error.message });
    if (error.codigoNegocio === 'SIN_EMPLEADOS') return res.status(400).json({ mensaje: error.message });
    errorServidor(res, 'Error al calcular la planilla', error);
  }
}

module.exports = {
  obtenerEmpleados, obtenerCombosEmpleado, crearEmpleado, actualizarEmpleado, eliminarEmpleado,
  obtenerCuentas, obtenerCombosCuenta, crearCuenta, actualizarCuenta, eliminarCuenta,
  obtenerInasistencias, obtenerEmpleadosComboInasistencia, crearInasistencia, actualizarInasistencia, eliminarInasistencia,
  obtenerPeriodos, obtenerResultadoPlanilla, calcularPlanilla
};
