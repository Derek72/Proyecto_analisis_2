const express = require('express');
const router = express.Router();
const empresaController = require('../Controller/empresaController.js');


router.get('/', empresaController.getEmpresas);




module.exports = router;