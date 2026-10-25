const liquidacionModel = require('../Model/liquidacionModel.js');
const empleadoModel = require('../Model/empleadoModel.js');

function errorServidor(res, mensaje, error) {
  console.error(mensaje, error);
  return res.status(500).json({ mensaje, error: error.message });
}

function validarParametrosInasistencia(sueldoBase, porcentaje, dias) {
  if (porcentaje !== undefined && porcentaje !== null && porcentaje !== '') {
    const numPct = Number(porcentaje);
    if (isNaN(numPct) || numPct < 0 || numPct > 100) {
      return 'El porcentaje de descuento por inasistencia debe ser un valor numérico entre 0% y 100%.';
    }
  }
  if (dias !== undefined && dias !== null && dias !== '') {
    const numDias = Number(dias);
    if (isNaN(numDias) || numDias < 0) {
      return 'La cantidad de días faltados no puede ser negativa ni tener un valor inválido.';
    }
    if (numDias > 0) {
      const base = Number(sueldoBase) || 0;
      if (base <= 0) {
        return 'Faltan datos necesarios para el cálculo de inasistencias: verifique que el salario base sea mayor a cero.';
      }
    }
  }
  return null;
}

async function simularLiquidacion(req, res) {
  try {
    const {
      IdLiquidacion,
      IdEmpleado,
      FechaContratacion, FechaEgreso, IngresoSueldoBase,
      IngresoBonificacionDecreto, IngresoOtrosIngresos,
      DescuentoIgss, DescuentoIsr,
      PorcentajeInasistencias, DiasFaltados, DiasInasistencia,
      DescuentoInasistencias, MotivoEgreso
    } = req.body;

    const fechaEgresoNorm = liquidacionModel.normalizarFechaIso(FechaEgreso);
    if (!fechaEgresoNorm) {
      return res.status(400).json({ mensaje: 'La fecha de egreso es obligatoria (formato DD/MM/AAAA).' });
    }

    let fechaContratacionFinal = liquidacionModel.normalizarFechaIso(FechaContratacion);
    let sueldoBaseFinal = IngresoSueldoBase;
    let bonificacionFinal = IngresoBonificacionDecreto;
    let otrosIngresosFinal = IngresoOtrosIngresos;
    let igssFinal = DescuentoIgss;
    let isrFinal = DescuentoIsr;
    let porcentajeInasFinal = PorcentajeInasistencias;

    let ultimoPeriodo = null;
    if (IdEmpleado) {
      const emp = await empleadoModel.obtenerPorId(IdEmpleado);
      if (!emp) {
        return res.status(404).json({ mensaje: 'Empleado no encontrado.' });
      }

      if (!IdLiquidacion && emp.IdStatusEmpleado !== 1) {
        return res.status(400).json({
          mensaje: `No es posible continuar con la liquidación: El empleado no se encuentra activo (su estado actual es ${emp.NombreStatus || 'Inactivo'}).`
        });
      }

      fechaContratacionFinal = liquidacionModel.normalizarFechaIso(emp.FechaContratacion);
      sueldoBaseFinal = emp.IngresoSueldoBase;
      bonificacionFinal = emp.IngresoBonificacionDecreto;
      otrosIngresosFinal = emp.IngresoOtrosIngresos;
      igssFinal = emp.DescuentoIgss;
      isrFinal = emp.DescuentoIsr;
      if (porcentajeInasFinal === undefined || porcentajeInasFinal === null || porcentajeInasFinal === '') {
        porcentajeInasFinal = emp.PorcentajeInasistencias ?? 100;
      }
      ultimoPeriodo = await liquidacionModel.obtenerUltimoPeriodoPlanillaEmpleado(IdEmpleado);
    }

    if (!fechaContratacionFinal || !fechaEgresoNorm || sueldoBaseFinal === undefined || sueldoBaseFinal === null) {
      return res.status(400).json({ mensaje: 'Fecha de contratación, egreso y sueldo base son obligatorios para el cálculo.' });
    }

    const errorFechas = liquidacionModel.validarFechasLiquidacion({
      fechaContratacion: fechaContratacionFinal,
      fechaEgreso: fechaEgresoNorm,
      ultimoPeriodo
    });
    if (errorFechas) {
      return res.status(400).json({ mensaje: errorFechas });
    }

    const diasAusencia = (DiasFaltados !== undefined && DiasFaltados !== null && DiasFaltados !== '')
      ? DiasFaltados
      : DiasInasistencia;

    const msgInas = validarParametrosInasistencia(sueldoBaseFinal, porcentajeInasFinal, diasAusencia);
    if (msgInas) {
      return res.status(400).json({ mensaje: msgInas });
    }

    const calculo = liquidacionModel.calcularPrestacionesLaborales({
      fechaContratacion: fechaContratacionFinal,
      fechaEgreso: fechaEgresoNorm,
      sueldoBase: sueldoBaseFinal,
      bonificacion: bonificacionFinal,
      otrosIngresos: otrosIngresosFinal,
      descuentoIgss: igssFinal,
      descuentoIsr: isrFinal,
      porcentajeInasistencias: porcentajeInasFinal,
      diasFaltados: diasAusencia,
      descuentoInasistencias: DescuentoInasistencias || 0,
      motivoEgreso: MotivoEgreso
    });

    res.json(calculo);
  } catch (error) {
    if (error.message && (error.message.includes('fecha') || error.message.includes('estrictamente') || error.message.includes('período') || error.message.includes('activo'))) {
      return res.status(400).json({ mensaje: error.message });
    }
    errorServidor(res, 'Error al simular la liquidación', error);
  }
}

async function obtenerLiquidaciones(req, res) {
  try {
    const listado = await liquidacionModel.obtenerLiquidaciones();
    res.json(listado);
  } catch (error) {
    errorServidor(res, 'Error al obtener liquidaciones', error);
  }
}

async function obtenerPorId(req, res) {
  try {
    const liq = await liquidacionModel.obtenerPorId(req.params.id);
    if (!liq) return res.status(404).json({ mensaje: 'Liquidación no encontrada.' });
    res.json(liq);
  } catch (error) {
    errorServidor(res, 'Error al obtener la liquidación', error);
  }
}

async function crearLiquidacion(req, res) {
  try {
    const b = req.body;
    const fechaEgresoNorm = liquidacionModel.normalizarFechaIso(b.FechaEgreso);
    const fechaLiquidacionNorm = liquidacionModel.normalizarFechaIso(b.FechaLiquidacion);

    if (!b.IdEmpleado || !fechaEgresoNorm || !fechaLiquidacionNorm || !b.MotivoEgreso) {
      return res.status(400).json({ mensaje: 'Empleado, fechas (DD/MM/AAAA) y motivo son campos obligatorios.' });
    }

    const emp = await empleadoModel.obtenerPorId(b.IdEmpleado);
    if (!emp) {
      return res.status(404).json({ mensaje: 'Empleado no encontrado.' });
    }

    if (emp.IdStatusEmpleado !== 1) {
      return res.status(400).json({
        mensaje: `No es posible continuar con la liquidación: El empleado no se encuentra activo (su estado actual es ${emp.NombreStatus || 'Inactivo'}).`
      });
    }

    const ultimoPeriodo = await liquidacionModel.obtenerUltimoPeriodoPlanillaEmpleado(b.IdEmpleado);
    const errorFechas = liquidacionModel.validarFechasLiquidacion({
      fechaContratacion: emp.FechaContratacion,
      fechaEgreso: fechaEgresoNorm,
      ultimoPeriodo
    });
    if (errorFechas) {
      return res.status(400).json({ mensaje: errorFechas });
    }

    const porcentajeInasFinal = (b.PorcentajeInasistencias !== undefined && b.PorcentajeInasistencias !== null && b.PorcentajeInasistencias !== '')
      ? b.PorcentajeInasistencias
      : (emp.PorcentajeInasistencias ?? 100);

    const diasAusencia = (b.DiasFaltados !== undefined && b.DiasFaltados !== null && b.DiasFaltados !== '')
      ? b.DiasFaltados
      : b.DiasInasistencia;

    const msgInas = validarParametrosInasistencia(emp.IngresoSueldoBase, porcentajeInasFinal, diasAusencia);
    if (msgInas) {
      return res.status(400).json({ mensaje: msgInas });
    }

    const datosLiquidacion = {
      IdEmpleado: emp.IdEmpleado,
      IdPuesto: emp.IdPuesto,
      FechaContratacion: emp.FechaContratacion,
      FechaEgreso: fechaEgresoNorm,
      FechaLiquidacion: fechaLiquidacionNorm,
      MotivoEgreso: b.MotivoEgreso,
      IngresoSueldoBase: emp.IngresoSueldoBase,
      IngresoBonificacionDecreto: emp.IngresoBonificacionDecreto,
      IngresoOtrosIngresos: emp.IngresoOtrosIngresos,
      DescuentoIgss: emp.DescuentoIgss,
      DescuentoIsr: emp.DescuentoIsr,
      PorcentajeInasistencias: porcentajeInasFinal,
      DiasFaltados: diasAusencia,
      DescuentoInasistencias: b.DescuentoInasistencias || 0,
      Observaciones: b.Observaciones || ''
    };

    const usuario = req.body.UsuarioCreacion || 'admin';
    const resultado = await liquidacionModel.registrarLiquidacionTransaccional(datosLiquidacion, usuario);
    res.status(201).json({ mensaje: 'Liquidación procesada y registrada exitosamente.', resultado });
  } catch (error) {
    if (error.message && (error.message.includes('fecha') || error.message.includes('estrictamente') || error.message.includes('período') || error.message.includes('activo'))) {
      return res.status(400).json({ mensaje: error.message });
    }
    errorServidor(res, 'Error al procesar la liquidación', error);
  }
}

async function actualizarLiquidacion(req, res) {
  try {
    const { id } = req.params;
    const b = req.body;
    const diasAusencia = (b.DiasFaltados !== undefined && b.DiasFaltados !== null && b.DiasFaltados !== '')
      ? b.DiasFaltados
      : b.DiasInasistencia;

    const msgInas = validarParametrosInasistencia(1, b.PorcentajeInasistencias, diasAusencia);
    if (msgInas) {
      return res.status(400).json({ mensaje: msgInas });
    }

    const usuario = req.body.UsuarioModificacion || 'admin';
    const resultado = await liquidacionModel.actualizarLiquidacion(id, b, usuario);
    res.json({ mensaje: 'Liquidación actualizada exitosamente.', resultado });
  } catch (error) {
    if (error.message && (error.message.includes('fecha') || error.message.includes('estrictamente') || error.message.includes('período') || error.message.includes('activo'))) {
      return res.status(400).json({ mensaje: error.message });
    }
    if (error.message === 'Liquidación no encontrada.') {
      return res.status(404).json({ mensaje: error.message });
    }
    errorServidor(res, 'Error al actualizar la liquidación', error);
  }
}

async function eliminarLiquidacion(req, res) {
  try {
    await liquidacionModel.eliminarLiquidacion(req.params.id);
    res.json({ mensaje: 'Liquidación eliminada exitosamente.' });
  } catch (error) {
    errorServidor(res, 'Error al eliminar la liquidación', error);
  }
}

module.exports = {
  validarParametrosInasistencia,
  simularLiquidacion,
  obtenerLiquidaciones,
  obtenerPorId,
  crearLiquidacion,
  actualizarLiquidacion,
  eliminarLiquidacion
};
