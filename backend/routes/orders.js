const express = require('express');
const router = express.Router();
const {
  createOrder, getOrders, getOrder, markAsPaid, cancelOrder,
  updateOrderStatus, getDashboardStats, getSalesReport, addItemsToOrder,
  updateCustomer, partialPay,                          // ← NEW
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');
const { mongoIdValidator } = require('../middleware/validators');

// ─── STATS ───
router.get('/stats/dashboard', protect, getDashboardStats);
router.get('/stats/report', protect, authorize('admin', 'manager'), getSalesReport);

// ─── BASIC ───
router.get('/', protect, getOrders);
router.post('/', protect, createOrder);

// ─── IMPORTANT: CUSTOM ROUTES FIRST ───
router.put('/:id/customer', protect, ...mongoIdValidator('id'), updateCustomer);
router.post('/:id/partial-pay', protect, ...mongoIdValidator('id'), partialPay);

// ─── OTHER ACTION ROUTES ───
router.put('/:id/pay', protect, ...mongoIdValidator('id'), markAsPaid);
router.put('/:id/cancel', protect, authorize('admin', 'manager'), ...mongoIdValidator('id'), cancelOrder);
router.put('/:id/status', protect, ...mongoIdValidator('id'), updateOrderStatus);
router.post('/:id/add-items', protect, ...mongoIdValidator('id'), addItemsToOrder);

// ─── LAST: GENERIC ID ROUTE ───
router.get('/:id', protect, ...mongoIdValidator('id'), getOrder);

module.exports = router;