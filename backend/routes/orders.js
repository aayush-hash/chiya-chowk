// routes/orders.js
const express = require('express');
const router = express.Router();
const { createOrder, getOrders, getOrder, markAsPaid, cancelOrder, updateOrderStatus, getDashboardStats, getSalesReport } = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');
const { orderValidator, mongoIdValidator } = require('../middleware/validators');

router.get('/stats/dashboard', protect, getDashboardStats);
router.get('/stats/report', protect, authorize('admin', 'manager'), getSalesReport);
router.get('/', protect, getOrders);
router.get('/:id', protect, ...mongoIdValidator('id'), getOrder);
router.post('/', protect, orderValidator, createOrder);
router.put('/:id/pay', protect, ...mongoIdValidator('id'), markAsPaid);
router.put('/:id/cancel', protect, authorize('admin', 'manager'), ...mongoIdValidator('id'), cancelOrder);
router.put('/:id/status', protect, ...mongoIdValidator('id'), updateOrderStatus);

module.exports = router;