const express = require('express');
const router = express.Router();
const { getFabrics, addFabric, getSuppliers, addSupplier } = require('../controllers/inventoryController.cjs');

router.get('/fabrics', getFabrics);
router.post('/fabrics', addFabric);
router.get('/suppliers', getSuppliers);
router.post('/suppliers', addSupplier);

module.exports = router;
