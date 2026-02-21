const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser, deleteUser, resetUserPassword, getSettings, updateSettings } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { createUserValidator, mongoIdValidator } = require('../middleware/validators');

router.get('/', protect, authorize('admin'), getUsers);
router.post('/', protect, authorize('admin'), createUserValidator, createUser);
router.put('/:id', protect, authorize('admin'), ...mongoIdValidator('id'), updateUser);
router.delete('/:id', protect, authorize('admin'), ...mongoIdValidator('id'), deleteUser);
router.put('/:id/reset-password', protect, authorize('admin'), ...mongoIdValidator('id'), resetUserPassword);

router.get('/settings', protect, getSettings);
router.put('/settings', protect, authorize('admin', 'manager'), updateSettings);

module.exports = router;