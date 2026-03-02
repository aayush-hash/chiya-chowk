const express = require('express');
const router = express.Router();
const {
  generateQRToken,
  getTablesWithQR,
  scanQR,
  placeQROrder,
  trackOrder,
  getLiveQROrders,
  updateQROrderStatus,
} = require('../controllers/qrController');
const { protect, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { validate } = require('../middleware/validators');

const placeOrderValidator = [
  body('customerName').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 100 }),
  body('customerPhone').optional().trim().isLength({ max: 20 }),
  body('items').isArray({ min: 1 }).withMessage('Cart cannot be empty'),
  body('items.*.menuItem').isMongoId().withMessage('Invalid menu item'),
  body('items.*.qty').isInt({ min: 1, max: 50 }).withMessage('Invalid quantity'),
  body('note').optional().trim().isLength({ max: 300 }),
  validate,
];

// ===== PUBLIC ROUTES (no auth required) =====
router.get('/scan/:token', scanQR);
router.post('/order/:token', placeOrderValidator, placeQROrder);
router.get('/track/:orderId', trackOrder);

// ===== PRIVATE ROUTES (staff auth required) =====
router.get('/tables', protect, authorize('admin', 'manager'), getTablesWithQR);
router.post('/tables/:id/generate', protect, authorize('admin', 'manager'), generateQRToken);
router.get('/orders/live', protect, getLiveQROrders);
router.patch('/orders/:id/status', protect, updateQROrderStatus);

module.exports = router;