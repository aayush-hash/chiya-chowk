const { body, param, query, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const loginValidator = [
  body('username').trim().notEmpty().withMessage('Username is required').isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, underscores'),
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 6, max: 128 }),
  validate,
];

const createUserValidator = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 50 }),
  body('username').trim().notEmpty().withMessage('Username is required').isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/).withMessage('Invalid username format'),
  body('password').isLength({ min: 6, max: 128 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin', 'manager', 'cashier', 'staff']).withMessage('Invalid role'),
  validate,
];

const menuItemValidator = [
  body('name').trim().notEmpty().withMessage('Item name is required').isLength({ max: 100 }),
  body('category').isIn(['Tea', 'Coffee', 'Snacks', 'Drinks', 'Food', 'Desserts', 'Other']).withMessage('Invalid category'),
  body('price').isFloat({ min: 0, max: 100000 }).withMessage('Price must be a valid positive number'),
  body('emoji').optional().trim().isLength({ max: 10 }),
  body('description').optional().trim().isLength({ max: 300 }),
  validate,
];

// items array validation removed — done manually in orderController
const orderValidator = [
  body('orderType').isIn(['dine-in', 'takeaway', 'delivery']).withMessage('Invalid order type'),
  body('paymentMethod').optional({ nullable: true }).isIn(['cash', 'qr', 'card', 'credit', 'pending']).withMessage('Invalid payment method'),
  body('discount').optional({ nullable: true }).isFloat({ min: 0 }),
  body('discountType').optional({ nullable: true }).isIn(['fixed', 'percentage']),
  body('note').optional({ nullable: true }).trim().isLength({ max: 500 }),
  body('tableId').optional({ nullable: true }),
  body('tableNumber').optional({ nullable: true }),
  body('customerName').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('customerPhone').optional({ nullable: true }).trim().isLength({ max: 20 }),
  validate,
];

const tableValidator = [
  body('number').isInt({ min: 1, max: 200 }).withMessage('Table number must be between 1 and 200'),
  body('seats').isInt({ min: 1, max: 20 }).withMessage('Seats must be between 1 and 20'),
  body('location').optional().isIn(['indoor', 'outdoor', 'balcony', 'vip']),
  validate,
];

const mongoIdValidator = (field = 'id') => [
  param(field).isMongoId().withMessage(`Invalid ${field} format`),
  validate,
];

module.exports = { validate, loginValidator, createUserValidator, menuItemValidator, orderValidator, tableValidator, mongoIdValidator };