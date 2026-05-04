const User = require('../models/User');
const Settings = require('../models/Settings');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const { name, username, password, role, email, phone } = req.body;
    const user = await User.create({ name, username, password, role, email, phone });
    logger.info(`User created: ${username} (${role}) by ${req.user.username}`);
    res.status(201).json({
      success: true,
      message: 'Staff member added',
      user: { id: user._id, name: user.name, username: user.username, role: user.role },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { name, role, email, phone, isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, role, email, phone, isActive },
      { new: true, runValidators: true }
    ).select('-password');
    if (!user) return next(new AppError('User not found', 404));
    res.json({ success: true, message: 'User updated', user });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id.toString()) {
      return next(new AppError('Cannot delete your own account', 400));
    }
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user) return next(new AppError('User not found', 404));
    logger.info(`User deactivated: ${user.username} by ${req.user.username}`);
    res.json({ success: true, message: 'User deactivated' });
  } catch (error) {
    next(error);
  }
};

exports.resetUserPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return next(new AppError('Password must be at least 6 characters', 400));
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError('User not found', 404));
    user.password = newPassword;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
    logger.info(`Password reset for ${user.username} by ${req.user.username}`);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});
    res.json({ success: true, settings });
  } catch (error) {
    next(error);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const allowed = ['cafeName', 'address', 'phone', 'email', 'vatNumber',  'serviceChargeRate',
      'currency', 'currencySymbol', 'openingTime', 'closingTime', 'receiptFooter', 'enableServiceCharge',
      'enableVAT', 'allowReservations', 'printReceipt', 'isOpen'];
    const updates = {};
    allowed.forEach(key => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });
    updates.updatedBy = req.user._id;

    let settings = await Settings.findOneAndUpdate({}, updates, { new: true, upsert: true, runValidators: true });
    logger.info(`Settings updated by ${req.user.username}`);
    res.json({ success: true, message: 'Settings saved', settings });
  } catch (error) {
    next(error);
  }
};