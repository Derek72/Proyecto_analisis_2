const empresaModel = require('../Model/empresaModel.js');

async function getEmpresas(req, res) {
  try {
    const empresas = await empresaModel.obtenerEmpresas();
    res.json(empresas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}


module.exports = { getEmpresas };