const express = require('express');
const router = express.Router();
const { loginAdmin, registerAdmin, verifyWorkerPin } = require('../controllers/authController.cjs');

router.post('/login', loginAdmin);
router.post('/register', registerAdmin);
router.post('/verify-pin', verifyWorkerPin);

module.exports = router;
