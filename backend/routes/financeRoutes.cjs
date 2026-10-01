const express = require('express');
const router = express.Router();
const {
  getInvoices,
  createInvoice,
  getExpenses,
  addExpense,
  getFinancialOverview,
} = require('../controllers/financeController.cjs');

router.get('/invoices', getInvoices);
router.post('/invoices', createInvoice);
router.get('/expenses', getExpenses);
router.post('/expenses', addExpense);
router.get('/overview', getFinancialOverview);

module.exports = router;
