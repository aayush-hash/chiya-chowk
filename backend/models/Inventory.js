const mongoose = require('mongoose');

// Restock history subdocument
const restockSchema = new mongoose.Schema({
  quantity: { type: Number, required: true, min: 0 },
  note: { type: String, trim: true, maxlength: 200 },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  addedByName: { type: String },
  costPerUnit: { type: Number, min: 0, default: 0 },
  totalCost: { type: Number, min: 0, default: 0 },
}, { timestamps: true });

// Usage log subdocument (auto-filled when orders placed)
const usageLogSchema = new mongoose.Schema({
  quantity: { type: Number, required: true, min: 0 },
  orderId: { type: String },
  menuItemName: { type: String },
  date: { type: Date, default: Date.now },
}, { _id: false });

// ── NEW: Stock Take subdocument ──────────────────────────────────────────────
// Records a physical count done by staff at end of day/shift.
// Variance = actualCount - theoreticalStock (negative = shrinkage/waste)
const stockTakeSchema = new mongoose.Schema({
  date: { type: String, required: true },           // YYYY-MM-DD
  theoreticalStock: { type: Number, required: true, min: 0 }, // what system expected
  actualCount: { type: Number, required: true, min: 0 },      // what staff physically counted
  variance: { type: Number, required: true },                  // actual - theoretical (can be negative)
  variancePct: { type: Number },                               // variance as % of theoretical
  note: { type: String, trim: true, maxlength: 300 },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recordedByName: { type: String },
  // After a stock take, currentStock is set to actualCount
  stockAfter: { type: Number },
}, { timestamps: true });
// ─────────────────────────────────────────────────────────────────────────────

const inventorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Ingredient name is required'],
    trim: true,
    unique: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  category: {
    type: String,
    enum: ['Dairy', 'Tea & Coffee', 'Spices', 'Flour & Grains', 'Vegetables', 'Meat', 'Beverages', 'Packaging', 'Hookah', 'Other'],
    default: 'Other',
  },
  unit: {
    type: String,
    enum: ['kg', 'g', 'liters', 'ml', 'pieces', 'packets', 'packs', 'boxes', 'bottles', 'cans'],
    required: [true, 'Unit is required'],
  },
  currentStock: {
    type: Number,
    required: true,
    min: [0, 'Stock cannot be negative'],
    default: 0,
  },
  lowStockThreshold: {
    type: Number,
    required: true,
    min: 0,
    default: 10,
  },
  costPerUnit: {
    type: Number,
    min: 0,
    default: 0,
  },
  totalUsedToday: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalUsedThisMonth: {
    type: Number,
    default: 0,
    min: 0,
  },
  lastRestockedAt: { type: Date },
  lastUsedAt: { type: Date },

  // Daily usage reset date
  usageResetDate: {
    type: String, // YYYY-MM-DD
    default: () => new Date().toISOString().slice(0, 10),
  },

  // ── NEW: tracks whether a stock take has been done today ──────────────────
  lastStockTakeDate: {
    type: String, // YYYY-MM-DD — prevents double-submission on same day
    default: null,
  },
  // ─────────────────────────────────────────────────────────────────────────

  restockHistory: { type: [restockSchema], default: [] },
  usageLog: { type: [usageLogSchema], default: [] },

  // ── NEW ───────────────────────────────────────────────────────────────────
  stockTakeHistory: { type: [stockTakeSchema], default: [] },
  // ─────────────────────────────────────────────────────────────────────────

  // Links to menu items that use this ingredient
  usedInMenuItems: [{
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    menuItemName: { type: String },
    quantityPerServing: { type: Number, min: 0, default: 0 },
  }],

  supplier: { type: String, trim: true, maxlength: 100, default: '' },
  notes: { type: String, trim: true, maxlength: 300, default: '' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ── Virtuals ────────────────────────────────────────────────────────────────
inventorySchema.virtual('isLowStock').get(function () {
  return this.currentStock <= this.lowStockThreshold && this.currentStock > 0;
});

inventorySchema.virtual('isOutOfStock').get(function () {
  return this.currentStock <= 0;
});

inventorySchema.virtual('stockStatus').get(function () {
  if (this.currentStock <= 0) return 'out';
  if (this.currentStock <= this.lowStockThreshold) return 'low';
  return 'ok';
});

inventorySchema.virtual('stockValue').get(function () {
  return (this.currentStock * this.costPerUnit).toFixed(2);
});

// ── NEW: average variance % across last 7 stock takes ────────────────────
inventorySchema.virtual('avgVariancePct').get(function () {
  const recent = (this.stockTakeHistory || []).slice(-7);
  if (!recent.length) return null;
  const avg = recent.reduce((s, t) => s + (t.variancePct || 0), 0) / recent.length;
  return parseFloat(avg.toFixed(1));
});
// ─────────────────────────────────────────────────────────────────────────

// ── Methods ─────────────────────────────────────────────────────────────────

// Add stock (restock)
inventorySchema.methods.addStock = async function (quantity, addedBy, addedByName, costPerUnit, note) {
  this.currentStock += quantity;
  this.lastRestockedAt = new Date();
  if (costPerUnit) this.costPerUnit = costPerUnit;
  this.restockHistory.push({
    quantity,
    addedBy,
    addedByName,
    costPerUnit: costPerUnit || this.costPerUnit,
    totalCost: quantity * (costPerUnit || this.costPerUnit),
    note: note || '',
  });
  return this.save();
};

// Deduct stock (when order placed) — unchanged
inventorySchema.methods.deductStock = async function (quantity, orderId, menuItemName) {
  const today = new Date().toISOString().slice(0, 10);

  if (this.usageResetDate !== today) {
    this.totalUsedToday = 0;
    this.usageResetDate = today;
  }

  this.currentStock = Math.max(0, this.currentStock - quantity);
  this.totalUsedToday += quantity;
  this.totalUsedThisMonth += quantity;
  this.lastUsedAt = new Date();

  if (this.usageLog.length >= 100) {
    this.usageLog = this.usageLog.slice(-99);
  }
  this.usageLog.push({ quantity, orderId, menuItemName, date: new Date() });

  return this.save();
};

// ── NEW: Record a physical stock take ─────────────────────────────────────
// actualCount  — what staff physically counted
// Sets currentStock = actualCount and logs the variance
inventorySchema.methods.recordStockTake = async function (actualCount, recordedBy, recordedByName, note) {
  const today = new Date().toISOString().slice(0, 10);

  const theoreticalStock = this.currentStock;
  const variance = actualCount - theoreticalStock;
  const variancePct = theoreticalStock > 0
    ? parseFloat(((variance / theoreticalStock) * 100).toFixed(1))
    : 0;

  // Update current stock to the physically verified number
  this.currentStock = actualCount;
  this.lastStockTakeDate = today;

  // Keep stock take history lean — last 30 entries
  if (this.stockTakeHistory.length >= 30) {
    this.stockTakeHistory = this.stockTakeHistory.slice(-29);
  }

  this.stockTakeHistory.push({
    date: today,
    theoreticalStock,
    actualCount,
    variance,
    variancePct,
    note: note || '',
    recordedBy,
    recordedByName,
    stockAfter: actualCount,
  });

  // Also log to usageLog if stock went down (waste / shrinkage)
  if (variance < 0) {
    if (this.usageLog.length >= 100) {
      this.usageLog = this.usageLog.slice(-99);
    }
    this.usageLog.push({
      quantity: Math.abs(variance),
      menuItemName: `Stock take adjustment (${note || 'shrinkage'})`,
      date: new Date(),
    });
    // Count shrinkage in daily total
    this.totalUsedToday = (this.totalUsedToday || 0) + Math.abs(variance);
    this.totalUsedThisMonth = (this.totalUsedThisMonth || 0) + Math.abs(variance);
  }

  return this.save();
};
// ─────────────────────────────────────────────────────────────────────────

// ── Indexes ──────────────────────────────────────────────────────────────────
inventorySchema.index({ category: 1, isActive: 1 });
inventorySchema.index({ currentStock: 1, lowStockThreshold: 1 });
inventorySchema.index({ 'usedInMenuItems.menuItem': 1 });

module.exports = mongoose.model('Inventory', inventorySchema);