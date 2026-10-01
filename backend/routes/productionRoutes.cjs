const express = require('express');
const router = express.Router();
const { getCuttings, recordCutting, getTailorAssignments, submitTailorWork } = require('../controllers/productionController.cjs');

router.get('/cuttings', getCuttings);
router.post('/cuttings', recordCutting);
router.get('/assignments', getTailorAssignments);
router.post('/assignments/submit', submitTailorWork);

module.exports = router;
