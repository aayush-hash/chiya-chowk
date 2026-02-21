const express = require('express');
const router = express.Router();
const { getMenuItems, getMenuItem, createMenuItem, updateMenuItem, deleteMenuItem, toggleAvailability, getCategories } = require('../controllers/menuController');
const { protect, authorize } = require('../middleware/auth');
const { menuItemValidator, mongoIdValidator } = require('../middleware/validators');

router.get('/', protect, getMenuItems);
router.get('/categories', protect, getCategories);
router.get('/:id', protect, ...mongoIdValidator('id'), getMenuItem);
router.post('/', protect, authorize('admin', 'manager'), menuItemValidator, createMenuItem);
router.put('/:id', protect, authorize('admin', 'manager'), ...mongoIdValidator('id'), updateMenuItem);
router.patch('/:id/toggle', protect, authorize('admin', 'manager'), ...mongoIdValidator('id'), toggleAvailability);
router.delete('/:id', protect, authorize('admin', 'manager'), ...mongoIdValidator('id'), deleteMenuItem);

module.exports = router;