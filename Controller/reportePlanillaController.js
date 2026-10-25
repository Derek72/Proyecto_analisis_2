const reporteModel = require('../Model/reportePlanillaModel.js');

function errorServidor(res, mensaje, error) {
  console.error(mensaje, error);
  return res.status(500).json({ mensaje, error: error.message });
}

async function obtenerPeriodosReporte(req, res) {
  try {
    const periodos = await reporteModel.obtenerPeriodosProcesados();
    res.json(periodos);
  } catch (error) {
    errorServidor(res, 'Error al obtener los períodos procesados', error);
  }
}

async function obtenerReporteConsolidado(req, res) {
  try {
    const { anio, mes } = req.params;
    if (!anio || !mes) {
      return res.status(400).json({ mensaje: 'Debe especificar el año y mes del período.' });
    }

    const reporte = await reporteModel.obtenerReportePorPeriodo(Number(anio), Number(mes));
    if (!reporte) {
      return res.status(404).json({ mensaje: 'No existe una planilla procesada para el período especificado.' });
    }

    res.json(reporte);
  } catch (error) {
    errorServidor(res, 'Error al consultar el reporte de planilla', error);
  }
}

module.exports = {
  obtenerPeriodosReporte,
  obtenerReporteConsolidado
};
