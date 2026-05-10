const express = require('express');
const router = express.Router();
const { createOrder, getOrders, getOrder, markAsPaid, cancelOrder, updateOrderStatus, getDashboardStats, getSalesReport, addItemsToOrder,partialPay,updateCustomer } = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');
const { mongoIdValidator } = require('../middleware/validators');

router.get('/stats/dashboard', protect, getDashboardStats);
router.get('/stats/report', protect, authorize('admin', 'manager'), getSalesReport);

// All specific /:id/action routes BEFORE the plain /:id GET
router.post('/:id/add-items',   protect, ...mongoIdValidator('id'), addItemsToOrder);
router.put('/:id/pay',          protect, ...mongoIdValidator('id'), markAsPaid);
router.put('/:id/cancel',       protect, authorize('admin', 'manager'), ...mongoIdValidator('id'), cancelOrder);
router.put('/:id/status',       protect, ...mongoIdValidator('id'), updateOrderStatus);
router.put('/:id/partial-pay',  protect, ...mongoIdValidator('id'), partialPay);
router.put('/:id/customer',     protect, ...mongoIdValidator('id'), updateCustomer);

// Generic routes last
router.get('/',    protect, getOrders);
router.post('/',   protect, createOrder);
router.get('/:id', protect, ...mongoIdValidator('id'), getOrder);

module.exports = router;