const boletaModel = require('../Model/boletaPagoModel.js');

function errorServidor(res, mensaje, error) {
  console.error(mensaje, error);
  return res.status(500).json({ mensaje, error: error.message });
}

async function obtenerPeriodosBoletas(req, res) {
  try {
    const periodos = await boletaModel.obtenerPeriodosBoletas();
    res.json(periodos);
  } catch (error) {
    errorServidor(res, 'Error al obtener los períodos de boletas', error);
  }
}

async function obtenerEmpleadosPorPeriodo(req, res) {
  try {
    const { anio, mes } = req.params;
    if (!anio || !mes) {
      return res.status(400).json({ mensaje: 'Año y mes son requeridos.' });
    }
    const empleados = await boletaModel.obtenerEmpleadosPorPeriodo(Number(anio), Number(mes));
    res.json(empleados);
  } catch (error) {
    errorServidor(res, 'Error al obtener empleados de la planilla', error);
  }
}

async function obtenerBoleta(req, res) {
  try {
    const { anio, mes, idEmpleado } = req.params;
    if (!anio || !mes || !idEmpleado) {
      return res.status(400).json({ mensaje: 'Año, mes e ID de empleado son requeridos.' });
    }

    const boleta = await boletaModel.obtenerBoletaEmpleado(Number(anio), Number(mes), Number(idEmpleado));
    if (!boleta) {
      return res.status(404).json({ mensaje: 'No se encontró la boleta de pago para los datos proporcionados.' });
    }

    res.json(boleta);
  } catch (error) {
    errorServidor(res, 'Error al obtener la boleta de pago', error);
  }
}

module.exports = {
  obtenerPeriodosBoletas,
  obtenerEmpleadosPorPeriodo,
  obtenerBoleta
};
