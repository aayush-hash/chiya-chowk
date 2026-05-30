const Inventory = require('../models/Inventory');
const MenuItem = require('../models/MenuItem');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// @desc    Get all inventory items
// @route   GET /api/inventory
// @access  Private
exports.getInventory = async (req, res, next) => {
  try {
    const { category, status, search } = req.query;
    const filter = { isActive: true };

    if (category && category !== 'All') filter.category = category;
    if (search) filter.name = { $regex: search, $options: 'i' };

    let items = await Inventory.find(filter)
      .populate('usedInMenuItems.menuItem', 'name emoji')
      .sort({ name: 1 })
      .lean({ virtuals: true });

    if (status === 'low') items = items.filter(i => i.currentStock <= i.lowStockThreshold && i.currentStock > 0);
    if (status === 'out') items = items.filter(i => i.currentStock <= 0);
    if (status === 'ok') items = items.filter(i => i.currentStock > i.lowStockThreshold);

    const all = await Inventory.find({ isActive: true }).lean();
    const summary = {
      total: all.length,
      lowStock: all.filter(i => i.currentStock <= i.lowStockThreshold && i.currentStock > 0).length,
      outOfStock: all.filter(i => i.currentStock <= 0).length,
      healthy: all.filter(i => i.currentStock > i.lowStockThreshold).length,
      totalValue: all.reduce((s, i) => s + i.currentStock * i.costPerUnit, 0).toFixed(2),
    };

    res.json({ success: true, count: items.length, summary, items });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single inventory item
// @route   GET /api/inventory/:id
// @access  Private
exports.getInventoryItem = async (req, res, next) => {
  try {
    const item = await Inventory.findById(req.params.id)
      .populate('usedInMenuItems.menuItem', 'name emoji price category')
      .populate('restockHistory.addedBy', 'name');

    if (!item) return next(new AppError('Inventory item not found', 404));
    res.json({ success: true, item });
  } catch (error) {
    next(error);
  }
};

// @desc    Create inventory item
// @route   POST /api/inventory
// @access  Private (admin/manager)
exports.createInventoryItem = async (req, res, next) => {
  try {
    const { name, category, unit, currentStock, lowStockThreshold, costPerUnit, supplier, notes, usedInMenuItems } = req.body;

    const existing = await Inventory.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    if (existing) return next(new AppError(`"${name}" already exists in inventory`, 409));

    let menuLinks = [];
    if (usedInMenuItems && usedInMenuItems.length > 0) {
      for (const link of usedInMenuItems) {
        const menuItem = await MenuItem.findById(link.menuItem);
        if (!menuItem) continue;
        menuLinks.push({
          menuItem: menuItem._id,
          menuItemName: menuItem.name,
          quantityPerServing: link.quantityPerServing || 0,
        });
      }
    }

    const item = await Inventory.create({
      name: name.trim(),
      category: category || 'Other',
      unit,
      currentStock: currentStock || 0,
      lowStockThreshold: lowStockThreshold || 10,
      costPerUnit: costPerUnit || 0,
      supplier: supplier || '',
      notes: notes || '',
      usedInMenuItems: menuLinks,
      createdBy: req.user._id,
      lastRestockedAt: currentStock > 0 ? new Date() : null,
      restockHistory: currentStock > 0 ? [{
        quantity: currentStock,
        addedBy: req.user._id,
        addedByName: req.user.name,
        costPerUnit: costPerUnit || 0,
        totalCost: (currentStock || 0) * (costPerUnit || 0),
        note: 'Initial stock',
      }] : [],
    });

    logger.info(`Inventory created: ${item.name} by ${req.user.username}`);
    res.status(201).json({ success: true, message: `${item.name} added to inventory`, item });
  } catch (error) {
    next(error);
  }
};

// @desc    Update inventory item
// @route   PUT /api/inventory/:id
// @access  Private (admin/manager)
exports.updateInventoryItem = async (req, res, next) => {
  try {
    const { name, category, unit, lowStockThreshold, costPerUnit, supplier, notes, usedInMenuItems } = req.body;

    const item = await Inventory.findById(req.params.id);
    if (!item) return next(new AppError('Inventory item not found', 404));

    if (usedInMenuItems) {
      const menuLinks = [];
      for (const link of usedInMenuItems) {
        const menuItem = await MenuItem.findById(link.menuItem);
        if (!menuItem) continue;
        menuLinks.push({
          menuItem: menuItem._id,
          menuItemName: menuItem.name,
          quantityPerServing: link.quantityPerServing || 0,
        });
      }
      item.usedInMenuItems = menuLinks;
    }

    if (name) item.name = name.trim();
    if (category) item.category = category;
    if (unit) item.unit = unit;
    if (lowStockThreshold !== undefined) item.lowStockThreshold = lowStockThreshold;
    if (costPerUnit !== undefined) item.costPerUnit = costPerUnit;
    if (supplier !== undefined) item.supplier = supplier;
    if (notes !== undefined) item.notes = notes;

    await item.save();
    logger.info(`Inventory updated: ${item.name} by ${req.user.username}`);
    res.json({ success: true, message: 'Inventory item updated', item });
  } catch (error) {
    next(error);
  }
};

// @desc    Restock — add stock to item
// @route   POST /api/inventory/:id/restock
// @access  Private (admin/manager)
exports.restockItem = async (req, res, next) => {
  try {
    const { quantity, costPerUnit, note } = req.body;
    if (!quantity || quantity <= 0) return next(new AppError('Quantity must be greater than 0', 400));

    const item = await Inventory.findById(req.params.id);
    if (!item) return next(new AppError('Inventory item not found', 404));

    const prevStock = item.currentStock;
    await item.addStock(quantity, req.user._id, req.user.name, costPerUnit, note);

    logger.info(`Restocked: ${item.name} +${quantity} ${item.unit} by ${req.user.username}`);
    res.json({
      success: true,
      message: `Added ${quantity} ${item.unit} to ${item.name}`,
      item: { name: item.name, unit: item.unit, previousStock: prevStock, addedQuantity: quantity, currentStock: item.currentStock },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Manual stock adjustment (correction)
// @route   PATCH /api/inventory/:id/adjust
// @access  Private (admin/manager)
exports.adjustStock = async (req, res, next) => {
  try {
    const { newStock, reason } = req.body;
    if (newStock === undefined || newStock < 0) return next(new AppError('Valid stock quantity required', 400));

    const item = await Inventory.findById(req.params.id);
    if (!item) return next(new AppError('Inventory item not found', 404));

    const diff = newStock - item.currentStock;
    const prevStock = item.currentStock;
    item.currentStock = newStock;

    if (diff > 0) {
      item.restockHistory.push({
        quantity: diff,
        addedBy: req.user._id,
        addedByName: req.user.name,
        costPerUnit: item.costPerUnit,
        totalCost: diff * item.costPerUnit,
        note: `Manual adjustment: ${reason || 'Stock correction'}`,
      });
      item.lastRestockedAt = new Date();
    } else if (diff < 0) {
      item.usageLog.push({
        quantity: Math.abs(diff),
        menuItemName: `Manual: ${reason || 'Stock correction'}`,
        date: new Date(),
      });
    }

    await item.save();
    logger.info(`Stock adjusted: ${item.name} ${prevStock} → ${newStock} by ${req.user.username}`);
    res.json({ success: true, message: `Stock adjusted to ${newStock} ${item.unit}`, item });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete inventory item (soft delete)
// @route   DELETE /api/inventory/:id
// @access  Private (admin)
exports.deleteInventoryItem = async (req, res, next) => {
  try {
    const item = await Inventory.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!item) return next(new AppError('Inventory item not found', 404));
    logger.info(`Inventory deleted: ${item.name} by ${req.user.username}`);
    res.json({ success: true, message: `${item.name} removed from inventory` });
  } catch (error) {
    next(error);
  }
};

// ── NEW: Submit end-of-day stock take ──────────────────────────────────────
// @desc    Staff physically counts items and submits actual quantities.
//          System calculates variance vs theoretical (what system expected).
//          currentStock is then corrected to actual count.
// @route   POST /api/inventory/stock-take
// @access  Private (admin/manager)
exports.submitStockTake = async (req, res, next) => {
  try {
    const { items, note } = req.body;
    // items = [{ inventoryId, actualCount, note }]

    if (!items || !Array.isArray(items) || items.length === 0) {
      return next(new AppError('No items provided for stock take', 400));
    }

    const today = new Date().toISOString().slice(0, 10);
    const results = [];
    let totalVariance = 0;
    let totalItems = 0;

    for (const entry of items) {
      const { inventoryId, actualCount, itemNote } = entry;
      if (actualCount === undefined || actualCount === null || actualCount < 0) continue;

      const inv = await Inventory.findById(inventoryId);
      if (!inv || !inv.isActive) continue;

      await inv.recordStockTake(
        parseFloat(actualCount),
        req.user._id,
        req.user.name,
        itemNote || note || ''
      );

      const lastTake = inv.stockTakeHistory[inv.stockTakeHistory.length - 1];
      results.push({
        _id: inv._id,
        name: inv.name,
        unit: inv.unit,
        theoreticalStock: lastTake.theoreticalStock,
        actualCount: lastTake.actualCount,
        variance: lastTake.variance,
        variancePct: lastTake.variancePct,
        stockAfter: lastTake.actualCount,
        status: lastTake.variance < 0 ? 'shrinkage' : lastTake.variance > 0 ? 'surplus' : 'exact',
      });

      totalVariance += lastTake.variance;
      totalItems++;
    }

    const shrinkageItems = results.filter(r => r.variance < 0);
    const exactItems = results.filter(r => r.variance === 0);
    const surplusItems = results.filter(r => r.variance > 0);

    logger.info(`Stock take submitted by ${req.user.username}: ${totalItems} items, ${shrinkageItems.length} with shrinkage`);

    res.json({
      success: true,
      message: `Stock take complete — ${totalItems} items verified`,
      date: today,
      submittedBy: req.user.name,
      summary: {
        totalItems,
        shrinkageItems: shrinkageItems.length,
        exactItems: exactItems.length,
        surplusItems: surplusItems.length,
        totalVariance: parseFloat(totalVariance.toFixed(3)),
      },
      results,
    });
  } catch (error) {
    next(error);
  }
};

// ── NEW: Get stock take history (for report tab) ───────────────────────────
// @desc    Returns last N stock take entries per item with variance trends
// @route   GET /api/inventory/stock-take/history
// @access  Private (admin/manager)
exports.getStockTakeHistory = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 86400000);
    const end = endDate ? new Date(endDate) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const items = await Inventory.find({ isActive: true })
      .select('name unit category stockTakeHistory avgVariancePct currentStock lowStockThreshold')
      .lean({ virtuals: true });

    const history = items.map(item => {
      const takes = (item.stockTakeHistory || []).filter(t => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      });

      if (!takes.length) return null;

      const avgVariance = takes.reduce((s, t) => s + (t.variancePct || 0), 0) / takes.length;
      const totalShrinkage = takes.filter(t => t.variance < 0).reduce((s, t) => s + Math.abs(t.variance), 0);

      return {
        _id: item._id,
        name: item.name,
        unit: item.unit,
        category: item.category,
        currentStock: item.currentStock,
        takesCount: takes.length,
        avgVariancePct: parseFloat(avgVariance.toFixed(1)),
        totalShrinkage: parseFloat(totalShrinkage.toFixed(3)),
        lastTake: takes[takes.length - 1],
        takes,
        // Health signal: > -5% is normal, -5 to -15% is concerning, < -15% is critical
        shrinkageLevel:
          avgVariance >= -5 ? 'normal'
          : avgVariance >= -15 ? 'concerning'
          : 'critical',
      };
    }).filter(Boolean);

    history.sort((a, b) => a.avgVariancePct - b.avgVariancePct); // worst first

    res.json({ success: true, period: { start, end }, history });
  } catch (error) {
    next(error);
  }
};

// @desc    Get today's inventory usage summary
// @route   GET /api/inventory/stats/today
// @access  Private
exports.getTodayUsage = async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const items = await Inventory.find({ isActive: true })
      .select('name unit category currentStock lowStockThreshold totalUsedToday usageResetDate usageLog costPerUnit lastStockTakeDate')
      .lean({ virtuals: true });

    const usage = items.map(item => ({
      _id: item._id,
      name: item.name,
      unit: item.unit,
      category: item.category,
      currentStock: item.currentStock,
      lowStockThreshold: item.lowStockThreshold,
      stockStatus: item.stockStatus,
      isLowStock: item.isLowStock,
      isOutOfStock: item.isOutOfStock,
      usedToday: item.usageResetDate === today ? item.totalUsedToday : 0,
      stockTakeDoneToday: item.lastStockTakeDate === today, // ← NEW flag for UI
      todayUsageLog: item.usageResetDate === today
        ? (item.usageLog || []).filter(l => l.date && new Date(l.date).toISOString().slice(0, 10) === today)
        : [],
      stockValue: (item.currentStock * item.costPerUnit).toFixed(2),
    }));

    const totalItems = usage.length;
    const lowStockItems = usage.filter(i => i.isLowStock && !i.isOutOfStock);
    const outOfStockItems = usage.filter(i => i.isOutOfStock);
    const stockTakePendingItems = usage.filter(i => !i.stockTakeDoneToday); // ← NEW
    const totalValueConsumedToday = usage.reduce((s, i) => {
      const item = items.find(it => it._id.toString() === i._id.toString());
      return s + i.usedToday * (item?.costPerUnit || 0);
    }, 0);

    res.json({
      success: true,
      date: today,
      summary: {
        totalItems,
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length,
        stockTakePending: stockTakePendingItems.length, // ← NEW
        totalValueConsumedToday: totalValueConsumedToday.toFixed(2),
      },
      lowStockItems,
      outOfStockItems,
      usage,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get inventory usage report (date range)
// @route   GET /api/inventory/stats/report
// @access  Private (admin/manager)
exports.getInventoryReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 86400000);
    const end = endDate ? new Date(endDate) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const items = await Inventory.find({ isActive: true })
      .select('name unit category currentStock lowStockThreshold costPerUnit usageLog restockHistory stockTakeHistory totalUsedThisMonth')
      .lean({ virtuals: true });

    const report = items.map(item => {
      const usageInRange = (item.usageLog || []).filter(l => {
        const d = new Date(l.date);
        return d >= start && d <= end;
      });
      const restockInRange = (item.restockHistory || []).filter(r => {
        const d = new Date(r.createdAt);
        return d >= start && d <= end;
      });
      // ── NEW: stock takes in range ──────────────────────────────────────
      const takesInRange = (item.stockTakeHistory || []).filter(t => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      });

      const totalUsed = usageInRange.reduce((s, l) => s + l.quantity, 0);
      const totalRestocked = restockInRange.reduce((s, r) => s + r.quantity, 0);
      const costConsumed = (totalUsed * item.costPerUnit).toFixed(2);

      // ── NEW: variance stats ────────────────────────────────────────────
      const totalShrinkage = takesInRange
        .filter(t => t.variance < 0)
        .reduce((s, t) => s + Math.abs(t.variance), 0);
      const avgVariancePct = takesInRange.length
        ? parseFloat((takesInRange.reduce((s, t) => s + (t.variancePct || 0), 0) / takesInRange.length).toFixed(1))
        : null;

      return {
        _id: item._id,
        name: item.name,
        unit: item.unit,
        category: item.category,
        currentStock: item.currentStock,
        lowStockThreshold: item.lowStockThreshold,
        stockStatus: item.stockStatus,
        totalUsed: parseFloat(totalUsed.toFixed(3)),
        totalRestocked: parseFloat(totalRestocked.toFixed(3)),
        costConsumed,
        totalShrinkage: parseFloat(totalShrinkage.toFixed(3)),
        avgVariancePct,
        stockTakesCount: takesInRange.length,
        usageBreakdown: usageInRange,
        restockBreakdown: restockInRange,
      };
    });

    report.sort((a, b) => b.totalUsed - a.totalUsed);

    const totalCostConsumed = report.reduce((s, i) => s + parseFloat(i.costConsumed), 0);
    const totalShrinkage = report.reduce((s, i) => s + i.totalShrinkage, 0);

    res.json({
      success: true,
      period: { start, end },
      summary: {
        totalItems: report.length,
        totalCostConsumed: totalCostConsumed.toFixed(2),
        totalShrinkage: totalShrinkage.toFixed(3),
        mostUsed: report[0]?.name || 'N/A',
      },
      report,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Deduct stock when an order is placed (internal use)
// Called from orderController after order is created
exports.deductStockForOrder = async (orderId, orderItems) => {
  try {
    for (const orderItem of orderItems) {
      const linkedInventory = await Inventory.find({
        'usedInMenuItems.menuItem': orderItem.menuItem,
        isActive: true,
      });

      for (const inv of linkedInventory) {
        const link = inv.usedInMenuItems.find(
          l => l.menuItem.toString() === orderItem.menuItem.toString()
        );
        if (!link || !link.quantityPerServing) continue;

        const totalDeduct = link.quantityPerServing * orderItem.qty;
        await inv.deductStock(totalDeduct, orderId, orderItem.name);

        if (inv.currentStock <= inv.lowStockThreshold) {
          logger.warn(`LOW STOCK: ${inv.name} is now at ${inv.currentStock} ${inv.unit}`);
        }
      }
    }
  } catch (error) {
    logger.error(`Stock deduction error for order ${orderId}: ${error.message}`);
  }
};

// @desc    Get all menu items for linking
// @route   GET /api/inventory/menu-items
// @access  Private
exports.getMenuItemsForLinking = async (req, res, next) => {
  try {
    const items = await MenuItem.find({ isDeleted: false, isAvailable: true })
      .select('name emoji category price')
      .sort({ category: 1, name: 1 });
    res.json({ success: true, items });
  } catch (error) {
    next(error);
  }
};