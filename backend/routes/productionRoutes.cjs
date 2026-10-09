const express = require('express');
const router = express.Router();
const { authenticateTenant } = require('../middleware/authMiddleware.cjs');
const { getCuttings, recordCutting, getTailorAssignments, submitTailorWork } = require('../controllers/productionController.cjs');

router.use(authenticateTenant);

router.get('/cuttings', getCuttings);
router.post('/cuttings', recordCutting);
router.get('/assignments', getTailorAssignments);
router.post('/assignments/submit', submitTailorWork);

module.exports = router;
