const express = require('express');
const router = express.Router();
const {
  loginAdmin,
  registerAdmin,
  verifyWorkerPin,
  forgotPassword,
  verifyOtp,
  resetPassword,
} = require('../controllers/authController.cjs');

router.post('/login', loginAdmin);
router.post('/register', registerAdmin);
router.post('/verify-pin', verifyWorkerPin);

// Password recovery endpoints
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

module.exports = router;

