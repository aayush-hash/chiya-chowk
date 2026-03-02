const express = require('express');
const router = express.Router();
const {
  getInventory,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  restockItem,
  adjustStock,
  deleteInventoryItem,
  getTodayUsage,
  getInventoryReport,
  getMenuItemsForLinking,
} = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/auth');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validators');

// Validators
const inventoryValidator = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('unit').isIn(['kg', 'g', 'liters', 'ml', 'pieces', 'packets', 'boxes', 'bottles']).withMessage('Invalid unit'),
  body('currentStock').optional().isFloat({ min: 0 }).withMessage('Stock must be non-negative'),
  body('lowStockThreshold').optional().isFloat({ min: 0 }),
  body('costPerUnit').optional().isFloat({ min: 0 }),
  validate,
];

const restockValidator = [
  body('quantity').isFloat({ min: 0.001 }).withMessage('Quantity must be greater than 0'),
  body('costPerUnit').optional().isFloat({ min: 0 }),
  body('note').optional().trim().isLength({ max: 200 }),
  validate,
];

const adjustValidator = [
  body('newStock').isFloat({ min: 0 }).withMessage('Stock must be non-negative'),
  body('reason').optional().trim().isLength({ max: 200 }),
  validate,
];

const idValidator = [
  param('id').isMongoId().withMessage('Invalid ID'),
  validate,
];

// Stat routes (before :id to prevent conflicts)
router.get('/stats/today', protect, getTodayUsage);
router.get('/stats/report', protect, authorize('admin', 'manager'), getInventoryReport);
router.get('/menu-items', protect, getMenuItemsForLinking);

// CRUD routes
router.get('/', protect, getInventory);
router.get('/:id', protect, ...idValidator, getInventoryItem);
router.post('/', protect, authorize('admin', 'manager'), inventoryValidator, createInventoryItem);
router.put('/:id', protect, authorize('admin', 'manager'), ...idValidator, updateInventoryItem);
router.post('/:id/restock', protect, authorize('admin', 'manager'), ...idValidator, restockValidator, restockItem);
router.patch('/:id/adjust', protect, authorize('admin', 'manager'), ...idValidator, adjustValidator, adjustStock);
router.delete('/:id', protect, authorize('admin'), ...idValidator, deleteInventoryItem);

module.exports = router;