// routes/tables.js
const express = require('express');
const router = express.Router();
const { getTables, getTable, createTable, updateTable, updateTableStatus, clearTable, deleteTable } = require('../controllers/tableController');
const { protect, authorize } = require('../middleware/auth');
const { tableValidator, mongoIdValidator } = require('../middleware/validators');

router.get('/', protect, getTables);
router.get('/:id', protect, ...mongoIdValidator('id'), getTable);
router.post('/', protect, authorize('admin', 'manager'), tableValidator, createTable);
router.put('/:id', protect, authorize('admin', 'manager'), ...mongoIdValidator('id'), updateTable);
router.patch('/:id/status', protect, ...mongoIdValidator('id'), updateTableStatus);
router.patch('/:id/clear', protect, ...mongoIdValidator('id'), clearTable);
router.delete('/:id', protect, authorize('admin'), ...mongoIdValidator('id'), deleteTable);

module.exports = router;