const express = require('express');
const router = express.Router();
const { authenticateTenant } = require('../middleware/authMiddleware.cjs');
const {
  getInvoices,
  createInvoice,
  getExpenses,
  addExpense,
  getFinancialOverview,
} = require('../controllers/financeController.cjs');

router.use(authenticateTenant);

router.get('/invoices', getInvoices);
router.post('/invoices', createInvoice);
router.get('/expenses', getExpenses);
router.post('/expenses', addExpense);
router.get('/overview', getFinancialOverview);

module.exports = router;
