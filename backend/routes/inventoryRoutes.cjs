const express = require('express');
const router = express.Router();
const { authenticateTenant } = require('../middleware/authMiddleware.cjs');
const { getFabrics, addFabric, getSuppliers, addSupplier } = require('../controllers/inventoryController.cjs');

router.use(authenticateTenant);

router.get('/fabrics', getFabrics);
router.post('/fabrics', addFabric);
router.get('/suppliers', getSuppliers);
router.post('/suppliers', addSupplier);

module.exports = router;
