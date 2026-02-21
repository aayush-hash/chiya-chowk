const Table = require('../models/Table');
const Order = require('../models/Order');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

exports.getTables = async (req, res, next) => {
  try {
    const { status, location } = req.query;
    const filter = { isActive: true };
    if (status) filter.status = status;
    if (location) filter.location = location;
    const tables = await Table.find(filter).populate('currentOrder', 'orderId total items orderStatus').sort({ number: 1 });
    res.json({ success: true, count: tables.length, tables });
  } catch (error) {
    next(error);
  }
};

exports.getTable = async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.id).populate({
      path: 'currentOrder',
      populate: { path: 'cashier', select: 'name' },
    });
    if (!table) return next(new AppError('Table not found', 404));
    res.json({ success: true, table });
  } catch (error) {
    next(error);
  }
};

exports.createTable = async (req, res, next) => {
  try {
    const { number, seats, location, notes } = req.body;
    const existing = await Table.findOne({ number });
    if (existing) return next(new AppError(`Table ${number} already exists`, 409));
    const table = await Table.create({ number, seats: seats || 4, location: location || 'indoor', notes });
    logger.info(`Table ${number} created by ${req.user.username}`);
    res.status(201).json({ success: true, message: 'Table added', table });
  } catch (error) {
    next(error);
  }
};

exports.updateTable = async (req, res, next) => {
  try {
    const { seats, location, notes, status } = req.body;
    const allowed = { seats, location, notes };
    // Only allow status change if no active order on occupied transitions
    if (status) allowed.status = status;
    const table = await Table.findByIdAndUpdate(req.params.id, allowed, { new: true, runValidators: true });
    if (!table) return next(new AppError('Table not found', 404));
    res.json({ success: true, message: 'Table updated', table });
  } catch (error) {
    next(error);
  }
};

exports.updateTableStatus = async (req, res, next) => {
  try {
    const { status, reservedFor } = req.body;
    const table = await Table.findById(req.params.id);
    if (!table) return next(new AppError('Table not found', 404));
    if (table.status === 'occupied' && status !== 'available' && status !== 'dirty') {
      return next(new AppError('Cannot change status of occupied table without clearing order', 400));
    }
    table.status = status;
    if (status === 'reserved' && reservedFor) table.reservedFor = reservedFor;
    if (status === 'available') { table.reservedFor = {}; table.currentOrder = null; }
    await table.save();
    logger.info(`Table ${table.number} status set to ${status} by ${req.user.username}`);
    res.json({ success: true, message: `Table ${table.number} is now ${status}`, table });
  } catch (error) {
    next(error);
  }
};

exports.clearTable = async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) return next(new AppError('Table not found', 404));
    if (table.currentOrder) {
      const order = await Order.findById(table.currentOrder);
      if (order && order.paymentStatus === 'unpaid') {
        return next(new AppError('Cannot clear table with unpaid order. Mark order as paid first.', 400));
      }
    }
    table.status = 'available';
    table.currentOrder = null;
    table.reservedFor = {};
    await table.save();
    logger.info(`Table ${table.number} cleared by ${req.user.username}`);
    res.json({ success: true, message: `Table ${table.number} cleared`, table });
  } catch (error) {
    next(error);
  }
};

exports.deleteTable = async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) return next(new AppError('Table not found', 404));
    if (table.status === 'occupied') return next(new AppError('Cannot delete occupied table', 400));
    table.isActive = false;
    await table.save();
    res.json({ success: true, message: 'Table removed' });
  } catch (error) {
    next(error);
  }
};