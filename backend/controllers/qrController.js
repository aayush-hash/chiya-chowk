const crypto = require('crypto');
const Table = require('../models/Table');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const Settings = require('../models/Settings');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// Generate or regenerate QR token for a table
// @route   POST /api/qr/tables/:id/generate
// @access  Private (admin/manager)
exports.generateQRToken = async (req, res, next) => {
  try {
    const token = crypto.randomBytes(20).toString('hex');
    const table = await Table.findByIdAndUpdate(
      req.params.id,
      { qrToken: token },
      { new: true }
    );
    if (!table) return next(new AppError('Table not found', 404));

    const qrUrl = `${process.env.FRONTEND_URL}/menu/${token}`;
    logger.info(`QR token generated for Table ${table.number} by ${req.user.username}`);
    res.json({ success: true, token, qrUrl, tableNumber: table.number });
  } catch (error) {
    next(error);
  }
};

// Get all tables with their QR tokens (for admin to print/display)
// @route   GET /api/qr/tables
// @access  Private (admin/manager)
exports.getTablesWithQR = async (req, res, next) => {
  try {
    const tables = await Table.find({ isActive: true }).sort({ number: 1 }).lean();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const tablesWithQR = tables.map(t => ({
      ...t,
      qrUrl: t.qrToken ? `${frontendUrl}/menu/${t.qrToken}` : null,
    }));
    res.json({ success: true, tables: tablesWithQR, frontendUrl });
  } catch (error) {
    next(error);
  }
};

// ===== PUBLIC ROUTES (no auth) =====

// Get table info + menu by QR token
// @route   GET /api/qr/scan/:token
// @access  Public
exports.scanQR = async (req, res, next) => {
  try {
    const table = await Table.findOne({ qrToken: req.params.token, isActive: true }).lean();
    if (!table) return next(new AppError('Invalid QR code. Please ask staff for help.', 404));

    // Get menu grouped by category
    const menuItems = await MenuItem.find({ isAvailable: true, isDeleted: false })
      .select('name emoji category price description preparationTime tags')
      .sort({ category: 1, name: 1 })
      .lean();

    const categories = [...new Set(menuItems.map(m => m.category))];
    const menu = {};
    categories.forEach(cat => {
      menu[cat] = menuItems.filter(m => m.category === cat);
    });

    // Get cafe settings
    const settings = await Settings.findOne().lean();

    // Return existing active order if table is occupied
    const existingOrder = await Order.findOne({
      table: table._id,
      paymentStatus: 'unpaid',
      orderStatus: { $nin: ['completed', 'cancelled'] },
    }).sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      table: {
        _id: table._id,
        number: table.number,
        seats: table.seats,
        location: table.location,
        status: table.status,
      },
      menu,
      categories,
      settings: {
        cafeName: settings?.cafeName || 'Chiya Chowk',
        vatRate: settings?.vatRate || 13,
        enableServiceCharge: settings?.enableServiceCharge || false,
        serviceChargeRate: settings?.serviceChargeRate || 0,
        currency: 'Rs.',
      },
      existingOrder: existingOrder ? {
        _id: existingOrder._id,
        orderId: existingOrder.orderId,
        orderStatus: existingOrder.orderStatus,
        customerName: existingOrder.customerName,
        customerPhone: existingOrder.customerPhone,
        items: existingOrder.items,
        subtotal: existingOrder.subtotal,
        taxAmount: existingOrder.taxAmount,
        serviceCharge: existingOrder.serviceCharge,
        total: existingOrder.total,
        createdAt: existingOrder.createdAt,
      } : null,
    });
  } catch (error) {
    next(error);
  }
};

// Place order from QR scan (public)
// @route   POST /api/qr/order/:token
// @access  Public
exports.placeQROrder = async (req, res, next) => {
  try {
    const { customerName, customerPhone, items, note } = req.body;

    if (!customerName || customerName.trim().length < 2) {
      return next(new AppError('Please enter your name', 400));
    }
    if (!items || items.length === 0) {
      return next(new AppError('Cart is empty', 400));
    }

    const table = await Table.findOne({ qrToken: req.params.token, isActive: true });
    if (!table) return next(new AppError('Invalid QR code', 404));

    // Validate and enrich items from DB (never trust client prices)
    const enrichedItems = [];
    let subtotal = 0;
    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItem).lean();
      if (!menuItem || !menuItem.isAvailable || menuItem.isDeleted) {
        return next(new AppError(`"${item.name || 'Item'}" is not available right now`, 400));
      }
      const itemSubtotal = menuItem.price * item.qty;
      subtotal += itemSubtotal;
      enrichedItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        emoji: menuItem.emoji,
        category: menuItem.category,
        price: menuItem.price,
        qty: item.qty,
        subtotal: itemSubtotal,
        note: item.note || '',
      });

      // Increment sold count
      await MenuItem.findByIdAndUpdate(menuItem._id, { $inc: { soldCount: item.qty } });
    }

    // Get tax settings
    const settings = await Settings.findOne();
    const taxRate = settings?.vatRate || 13;
    const serviceChargeRate = settings?.enableServiceCharge ? (settings?.serviceChargeRate || 0) : 0;
    const taxAmount = Math.round(subtotal * taxRate / 100);
    const serviceCharge = Math.round(subtotal * serviceChargeRate / 100);
    const total = subtotal + taxAmount + serviceCharge;

    const order = await Order.create({
      table: table._id,
      tableNumber: table.number,
      orderType: 'dine-in',
      items: enrichedItems,
      subtotal,
      discount: 0,
      discountType: 'fixed',
      taxRate,
      taxAmount,
      serviceCharge,
      total,
      paymentMethod: 'pending',
      paymentStatus: 'unpaid',
      orderStatus: 'pending',
      cashier: null,
      cashierName: 'QR Order',
      customerName: customerName.trim(),
      customerPhone: customerPhone?.trim() || '',
      note: note || '',
      isQROrder: true,
      source: 'qr',
    });

    // Mark table as occupied
    await Table.findByIdAndUpdate(table._id, { status: 'occupied', currentOrder: order._id });

    logger.info(`QR Order placed: ${order.orderId} Table ${table.number} by ${customerName}`);

    res.status(201).json({
      success: true,
      message: 'Order placed! Staff will prepare it shortly.',
      order: {
        orderId: order.orderId,
        _id: order._id,
        tableNumber: table.number,
        items: enrichedItems,
        subtotal,
        taxAmount,
        serviceCharge,
        total,
        orderStatus: order.orderStatus,
        customerName: order.customerName,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Track order status (public — customer polls this)
// @route   GET /api/qr/track/:orderId
// @access  Public
exports.trackOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId })
      .select('orderId orderStatus paymentStatus tableNumber customerName items subtotal taxAmount serviceCharge total createdAt isQROrder')
      .lean();

    if (!order) return next(new AppError('Order not found', 404));

    const statusMessages = {
      pending: { label: 'Order Received', emoji: '📋', message: 'Your order has been received. Staff is reviewing it.' },
      preparing: { label: 'Being Prepared', emoji: '👨‍🍳', message: 'Your order is being prepared in the kitchen.' },
      ready: { label: 'Ready!', emoji: '✅', message: 'Your order is ready! Staff will bring it to your table.' },
      served: { label: 'Served', emoji: '🍵', message: 'Enjoy your meal! Ask staff if you need anything.' },
      completed: { label: 'Completed', emoji: '🙏', message: 'Thank you for dining with us!' },
      cancelled: { label: 'Cancelled', emoji: '❌', message: 'This order was cancelled. Please ask staff for help.' },
    };

    res.json({
      success: true,
      order: {
        ...order,
        statusInfo: statusMessages[order.orderStatus] || statusMessages.pending,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get pending QR orders for kitchen/staff dashboard
// @route   GET /api/qr/orders/live
// @access  Private
exports.getLiveQROrders = async (req, res, next) => {
  try {
    const orders = await Order.find({
      isQROrder: true,
      orderStatus: { $nin: ['completed', 'cancelled'] },
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    next(error);
  }
};

// Update order status (kitchen/staff)
// @route   PATCH /api/qr/orders/:id/status
// @access  Private
exports.updateQROrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) return next(new AppError('Invalid status', 400));

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus: status },
      { new: true }
    );
    if (!order) return next(new AppError('Order not found', 404));

    logger.info(`QR Order ${order.orderId} status → ${status} by ${req.user.username}`);
    res.json({ success: true, message: `Order marked as ${status}`, order });
  } catch (error) {
    next(error);
  }
};

// Add items to existing QR order (public — customer adds more items)
// @route   POST /api/qr/order/:token/add-items
// @access  Public
exports.addItemsToQROrder = async (req, res, next) => {
  try {
    const { orderId, items } = req.body;
    if (!items || items.length === 0) return next(new AppError('No items provided', 400));

    const table = await Table.findOne({ qrToken: req.params.token, isActive: true });
    if (!table) return next(new AppError('Invalid QR code', 404));

    const order = await Order.findById(orderId);
    if (!order) return next(new AppError('Order not found', 404));
    if (order.paymentStatus === 'paid') return next(new AppError('Order already paid', 400));
    if (order.table.toString() !== table._id.toString()) return next(new AppError('Order does not belong to this table', 403));

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItem).lean();
      if (!menuItem || !menuItem.isAvailable || menuItem.isDeleted) {
        return next(new AppError(`${item.name || 'Item'} is not available`, 400));
      }
      const existing = order.items.find(i => i.menuItem.toString() === menuItem._id.toString());
      if (existing) {
        existing.qty += item.qty;
        existing.subtotal = existing.price * existing.qty;
      } else {
        order.items.push({
          menuItem: menuItem._id,
          name: menuItem.name,
          emoji: menuItem.emoji,
          category: menuItem.category,
          price: menuItem.price,
          qty: item.qty,
          subtotal: menuItem.price * item.qty,
        });
      }
      await MenuItem.findByIdAndUpdate(menuItem._id, { $inc: { soldCount: item.qty } });
    }

    // Recalculate totals
    order.subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);
    const taxableAmount = Math.max(0, order.subtotal - (order.discount || 0));
    order.taxAmount = Math.round(taxableAmount * order.taxRate / 100);
    order.total = taxableAmount + order.taxAmount + (order.serviceCharge || 0);

    await order.save();

    res.json({ success: true, message: 'Items added to your order', order: { orderId: order.orderId, total: order.total, items: order.items } });
  } catch (error) {
    next(error);
  }
};