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
    enum: ['Dairy', 'Tea & Coffee', 'Spices', 'Flour & Grains', 'Vegetables', 'Beverages', 'Packaging', 'Other'],
    default: 'Other',
  },
  unit: {
    type: String,
    enum: ['kg', 'g', 'liters', 'ml', 'pieces', 'packets', 'boxes', 'bottles'],
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
  lastRestockedAt: {
    type: Date,
  },
  lastUsedAt: {
    type: Date,
  },
  // Daily usage reset date
  usageResetDate: {
    type: String, // YYYY-MM-DD
    default: () => new Date().toISOString().slice(0, 10),
  },
  restockHistory: {
    type: [restockSchema],
    default: [],
  },
  usageLog: {
    type: [usageLogSchema],
    default: [],
  },
  // Links to menu items that use this ingredient
  usedInMenuItems: [{
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    menuItemName: { type: String },
    quantityPerServing: { type: Number, min: 0, default: 0 }, // how much of this ingredient per 1 serving
  }],
  supplier: {
    type: String,
    trim: true,
    maxlength: 100,
    default: '',
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 300,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual: is low stock
inventorySchema.virtual('isLowStock').get(function () {
  return this.currentStock <= this.lowStockThreshold;
});

// Virtual: is out of stock
inventorySchema.virtual('isOutOfStock').get(function () {
  return this.currentStock <= 0;
});

// Virtual: stock status label
inventorySchema.virtual('stockStatus').get(function () {
  if (this.currentStock <= 0) return 'out';
  if (this.currentStock <= this.lowStockThreshold) return 'low';
  return 'ok';
});

// Virtual: total value of current stock
inventorySchema.virtual('stockValue').get(function () {
  return (this.currentStock * this.costPerUnit).toFixed(2);
});

// Method: add stock (restock)
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

// Method: deduct stock (when order placed)
inventorySchema.methods.deductStock = async function (quantity, orderId, menuItemName) {
  const today = new Date().toISOString().slice(0, 10);

  // Reset daily counter if new day
  if (this.usageResetDate !== today) {
    this.totalUsedToday = 0;
    this.usageResetDate = today;
  }

  this.currentStock = Math.max(0, this.currentStock - quantity);
  this.totalUsedToday += quantity;
  this.totalUsedThisMonth += quantity;
  this.lastUsedAt = new Date();

  // Keep only last 100 usage logs
  if (this.usageLog.length >= 100) {
    this.usageLog = this.usageLog.slice(-99);
  }
  this.usageLog.push({ quantity, orderId, menuItemName, date: new Date() });

  return this.save();
};

// Indexes
// inventorySchema.index({ name: 1 });
inventorySchema.index({ category: 1, isActive: 1 });
inventorySchema.index({ currentStock: 1, lowStockThreshold: 1 });
inventorySchema.index({ 'usedInMenuItems.menuItem': 1 });

module.exports = mongoose.model('Inventory', inventorySchema);