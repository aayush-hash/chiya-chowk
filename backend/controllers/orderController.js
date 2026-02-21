const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Table = require('../models/Table');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// @desc    Create order
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res, next) => {
  try {
    const { items, tableId, tableNumber, orderType, paymentMethod, discount, discountType, note, customerName, customerPhone, amountReceived } = req.body;

    // Validate and enrich items from DB (prevent price manipulation)
    const enrichedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItem).lean();
      if (!menuItem) return next(new AppError(`Menu item not found: ${item.menuItem}`, 404));
      if (!menuItem.isAvailable || menuItem.isDeleted) return next(new AppError(`${menuItem.name} is not available`, 400));

      const itemSubtotal = menuItem.price * item.qty;
      subtotal += itemSubtotal;
      enrichedItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        emoji: menuItem.emoji,
        category: menuItem.category,
        price: menuItem.price, // Always use DB price, not client price
        qty: item.qty,
        subtotal: itemSubtotal,
        note: item.note || '',
      });

      // Increment sold count
      await MenuItem.findByIdAndUpdate(menuItem._id, { $inc: { soldCount: item.qty } });
    }

    // Get settings for tax rate
    const Settings = require('../models/Settings');
    const settings = await Settings.findOne();
    const taxRate = settings?.vatRate || 13;
    const serviceChargeRate = settings?.enableServiceCharge ? (settings?.serviceChargeRate || 0) : 0;

    const discountAmount = discountType === 'percentage'
      ? Math.round(subtotal * (discount || 0) / 100)
      : (discount || 0);

    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = Math.round(taxableAmount * taxRate / 100);
    const serviceCharge = Math.round(taxableAmount * serviceChargeRate / 100);
    const total = taxableAmount + taxAmount + serviceCharge;
    const changeGiven = amountReceived ? Math.max(0, amountReceived - total) : 0;

    const order = await Order.create({
      table: tableId || null,
      tableNumber: tableNumber || null,
      orderType,
      items: enrichedItems,
      subtotal,
      discount: discountAmount,
      discountType: discountType || 'fixed',
      taxRate,
      taxAmount,
      serviceCharge,
      total,
      paymentMethod: paymentMethod || 'pending',
      paymentStatus: paymentMethod && paymentMethod !== 'pending' ? 'paid' : 'unpaid',
      orderStatus: 'pending',
      cashier: req.user._id,
      cashierName: req.user.name,
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      note: note || '',
      amountReceived: amountReceived || 0,
      changeGiven,
      paidAt: (paymentMethod && paymentMethod !== 'pending') ? new Date() : null,
    });

    // Update table status if dine-in
    if (tableId) {
      await Table.findByIdAndUpdate(tableId, {
        status: 'occupied',
        currentOrder: order._id,
      });
    }

    const populatedOrder = await Order.findById(order._id).populate('cashier', 'name username');

    logger.info(`Order created: ${order.orderId} by ${req.user.username}`);
    res.status(201).json({ success: true, message: 'Order placed successfully', order: populatedOrder });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
exports.getOrders = async (req, res, next) => {
  try {
    const { status, payment, date, startDate, endDate, tableNumber, page = 1, limit = 50, search } = req.query;

    const filter = {};

    if (status && status !== 'all') {
      if (['paid', 'unpaid', 'refunded', 'partial'].includes(status)) {
        filter.paymentStatus = status;
      } else if (['pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'].includes(status)) {
        filter.orderStatus = status;
      }
    }
    if (payment && payment !== 'all') filter.paymentMethod = payment;
    if (tableNumber) filter.tableNumber = parseInt(tableNumber);

    // Date filtering
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const dEnd = new Date(date);
      dEnd.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: d, $lte: dEnd };
    } else if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (search) {
      filter.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { cashierName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .populate('cashier', 'name username')
      .populate('table', 'number seats')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      count: orders.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      orders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('cashier', 'name username')
      .populate('table', 'number seats location');

    if (!order) return next(new AppError('Order not found', 404));
    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order payment status
// @route   PUT /api/orders/:id/pay
// @access  Private
exports.markAsPaid = async (req, res, next) => {
  try {
    const { paymentMethod, amountReceived } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return next(new AppError('Order not found', 404));
    if (order.paymentStatus === 'paid') return next(new AppError('Order already paid', 400));

    order.paymentStatus = 'paid';
    order.paymentMethod = paymentMethod || order.paymentMethod;
    order.orderStatus = 'completed';
    order.paidAt = new Date();
    order.amountReceived = amountReceived || order.total;
    order.changeGiven = Math.max(0, (amountReceived || order.total) - order.total);
    await order.save();

    // Free the table if occupied
    if (order.table) {
      await Table.findByIdAndUpdate(order.table, {
        status: 'dirty',
        currentOrder: null,
      });
    }

    logger.info(`Order paid: ${order.orderId} by ${req.user.username}`);
    res.json({ success: true, message: 'Order marked as paid', order });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private (admin/manager)
exports.cancelOrder = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return next(new AppError('Order not found', 404));
    if (order.paymentStatus === 'paid') return next(new AppError('Cannot cancel a paid order', 400));

    order.orderStatus = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelReason = reason || 'No reason provided';

    // Revert sold counts
    for (const item of order.items) {
      await MenuItem.findByIdAndUpdate(item.menuItem, { $inc: { soldCount: -item.qty } });
    }

    await order.save();

    if (order.table) {
      await Table.findByIdAndUpdate(order.table, { status: 'available', currentOrder: null });
    }

    logger.info(`Order cancelled: ${order.orderId} by ${req.user.username}`);
    res.json({ success: true, message: 'Order cancelled', order });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { orderStatus } = req.body;
    const validStatuses = ['pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'];
    if (!validStatuses.includes(orderStatus)) return next(new AppError('Invalid status', 400));

    const order = await Order.findByIdAndUpdate(req.params.id, { orderStatus }, { new: true, runValidators: true });
    if (!order) return next(new AppError('Order not found', 404));

    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

// @desc    Dashboard stats
// @route   GET /api/orders/stats/dashboard
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayEnd = new Date(today);
    yesterdayEnd.setMilliseconds(yesterdayEnd.getMilliseconds() - 1);

    // Today's aggregation
    const [todayStats] = await Order.aggregate([
      { $match: { createdAt: { $gte: today, $lte: todayEnd } } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          paidOrders: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] } },
          unpaidOrders: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'unpaid'] }, 1, 0] } },
          revenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0] } },
          unpaidAmount: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'unpaid'] }, '$total', 0] } },
          cashRevenue: { $sum: { $cond: [{ $and: [{ $eq: ['$paymentStatus', 'paid'] }, { $eq: ['$paymentMethod', 'cash'] }] }, '$total', 0] } },
          qrRevenue: { $sum: { $cond: [{ $and: [{ $eq: ['$paymentStatus', 'paid'] }, { $eq: ['$paymentMethod', 'qr'] }] }, '$total', 0] } },
        },
      },
    ]);

    // Yesterday's revenue for comparison
    const [yesterdayStats] = await Order.aggregate([
      { $match: { createdAt: { $gte: yesterday, $lte: yesterdayEnd }, paymentStatus: 'paid' } },
      { $group: { _id: null, revenue: { $sum: '$total' } } },
    ]);

    // Hourly data for today
    const hourlyData = await Order.aggregate([
      { $match: { createdAt: { $gte: today, $lte: todayEnd }, paymentStatus: 'paid' } },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { '_id': 1 } },
    ]);

    // Top selling items (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const topItems = await Order.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, paymentStatus: 'paid' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.menuItem',
          name: { $first: '$items.name' },
          emoji: { $first: '$items.emoji' },
          totalQty: { $sum: '$items.qty' },
          totalRevenue: { $sum: '$items.subtotal' },
        },
      },
      { $sort: { totalQty: -1 } },
      { $limit: 8 },
    ]);

    // Table occupancy
    const [tableStats] = await Table.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          occupied: { $sum: { $cond: [{ $eq: ['$status', 'occupied'] }, 1, 0] } },
          available: { $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] } },
          reserved: { $sum: { $cond: [{ $eq: ['$status', 'reserved'] }, 1, 0] } },
          dirty: { $sum: { $cond: [{ $eq: ['$status', 'dirty'] }, 1, 0] } },
        },
      },
    ]);

    const todayRevenue = todayStats?.revenue || 0;
    const yesterdayRevenue = yesterdayStats?.revenue || 0;
    const revenueChange = yesterdayRevenue > 0
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1)
      : 0;

    const avgOrderValue = todayStats?.paidOrders > 0
      ? Math.round(todayRevenue / todayStats.paidOrders)
      : 0;

    res.json({
      success: true,
      stats: {
        today: {
          revenue: todayRevenue,
          orders: todayStats?.totalOrders || 0,
          paidOrders: todayStats?.paidOrders || 0,
          unpaidOrders: todayStats?.unpaidOrders || 0,
          unpaidAmount: todayStats?.unpaidAmount || 0,
          cashRevenue: todayStats?.cashRevenue || 0,
          qrRevenue: todayStats?.qrRevenue || 0,
          avgOrderValue,
          revenueChange,
        },
        tables: tableStats || { total: 0, occupied: 0, available: 0, reserved: 0, dirty: 0 },
        hourlyData,
        topItems,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Sales report
// @route   GET /api/orders/stats/report
// @access  Private (admin/manager)
exports.getSalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 86400000);
    const end = endDate ? new Date(endDate) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    let groupByExpr;
    if (groupBy === 'hour') {
      groupByExpr = { $dateToString: { format: '%Y-%m-%d %H:00', date: '$createdAt' } };
    } else if (groupBy === 'week') {
      groupByExpr = { $dateToString: { format: '%Y-W%V', date: '$createdAt' } };
    } else if (groupBy === 'month') {
      groupByExpr = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
    } else {
      groupByExpr = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    }

    const dailyStats = await Order.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: groupByExpr,
          orders: { $sum: 1 },
          revenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0] } },
          cashRevenue: { $sum: { $cond: [{ $and: [{ $eq: ['$paymentStatus', 'paid'] }, { $eq: ['$paymentMethod', 'cash'] }] }, '$total', 0] } },
          qrRevenue: { $sum: { $cond: [{ $and: [{ $eq: ['$paymentStatus', 'paid'] }, { $eq: ['$paymentMethod', 'qr'] }] }, '$total', 0] } },
          unpaidAmount: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'unpaid'] }, '$total', 0] } },
          avgOrder: { $avg: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', null] } },
          taxCollected: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$taxAmount', 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Category breakdown
    const categoryStats = await Order.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, paymentStatus: 'paid' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.category',
          revenue: { $sum: '$items.subtotal' },
          qty: { $sum: '$items.qty' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    // Summary
    const [summary] = await Order.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0] } },
          totalCash: { $sum: { $cond: [{ $and: [{ $eq: ['$paymentStatus', 'paid'] }, { $eq: ['$paymentMethod', 'cash'] }] }, '$total', 0] } },
          totalQR: { $sum: { $cond: [{ $and: [{ $eq: ['$paymentStatus', 'paid'] }, { $eq: ['$paymentMethod', 'qr'] }] }, '$total', 0] } },
          totalUnpaid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'unpaid'] }, '$total', 0] } },
          totalTax: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$taxAmount', 0] } },
          paidOrders: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] } },
        },
      },
    ]);

    res.json({
      success: true,
      report: {
        summary: summary || {},
        dailyStats,
        categoryStats,
        period: { start, end, groupBy },
      },
    });
  } catch (error) {
    next(error);
  }
};