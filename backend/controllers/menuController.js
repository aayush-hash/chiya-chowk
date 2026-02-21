const MenuItem = require('../models/MenuItem');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

exports.getMenuItems = async (req, res, next) => {
  try {
    const { category, available, search } = req.query;
    const filter = { isDeleted: false };
    if (category && category !== 'All') filter.category = category;
    if (available === 'true') filter.isAvailable = true;
    if (search) filter.$text = { $search: search };

    const items = await MenuItem.find(filter).sort({ category: 1, name: 1 }).lean();
    const categories = [...new Set(items.map(i => i.category))];
    res.json({ success: true, count: items.length, categories, items });
  } catch (error) {
    next(error);
  }
};

exports.getMenuItem = async (req, res, next) => {
  try {
    const item = await MenuItem.findOne({ _id: req.params.id, isDeleted: false });
    if (!item) return next(new AppError('Menu item not found', 404));
    res.json({ success: true, item });
  } catch (error) {
    next(error);
  }
};

exports.createMenuItem = async (req, res, next) => {
  try {
    const { name, category, price, emoji, description, costPrice, preparationTime, tags } = req.body;
    const existing = await MenuItem.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') }, isDeleted: false });
    if (existing) return next(new AppError(`Item "${name}" already exists`, 409));

    const item = await MenuItem.create({
      name, category, price, emoji: emoji || '🍽️',
      description: description || '', costPrice: costPrice || 0,
      preparationTime: preparationTime || 5, tags: tags || [],
      createdBy: req.user._id,
    });
    logger.info(`Menu item created: ${item.name} by ${req.user.username}`);
    res.status(201).json({ success: true, message: 'Menu item added successfully', item });
  } catch (error) {
    next(error);
  }
};

exports.updateMenuItem = async (req, res, next) => {
  try {
    const { name, category, price, emoji, description, isAvailable, costPrice, preparationTime } = req.body;
    const item = await MenuItem.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { name, category, price, emoji, description, isAvailable, costPrice, preparationTime },
      { new: true, runValidators: true }
    );
    if (!item) return next(new AppError('Menu item not found', 404));
    logger.info(`Menu item updated: ${item.name} by ${req.user.username}`);
    res.json({ success: true, message: 'Menu item updated', item });
  } catch (error) {
    next(error);
  }
};

exports.toggleAvailability = async (req, res, next) => {
  try {
    const item = await MenuItem.findOne({ _id: req.params.id, isDeleted: false });
    if (!item) return next(new AppError('Menu item not found', 404));
    item.isAvailable = !item.isAvailable;
    await item.save();
    res.json({ success: true, message: `${item.name} is now ${item.isAvailable ? 'available' : 'unavailable'}`, item });
  } catch (error) {
    next(error);
  }
};

exports.deleteMenuItem = async (req, res, next) => {
  try {
    const item = await MenuItem.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true, isAvailable: false },
      { new: true }
    );
    if (!item) return next(new AppError('Menu item not found', 404));
    logger.info(`Menu item deleted: ${item.name} by ${req.user.username}`);
    res.json({ success: true, message: 'Menu item deleted' });
  } catch (error) {
    next(error);
  }
};

exports.getCategories = async (req, res, next) => {
  try {
    const categories = await MenuItem.distinct('category', { isDeleted: false });
    res.json({ success: true, categories });
  } catch (error) {
    next(error);
  }
};