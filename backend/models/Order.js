const mongoose = require('mongoose');


const orderItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true,
  },
  name: { type: String, required: true },
  emoji: { type: String, default: '🍽️' },
  category: { type: String },
  price: { type: Number, required: true, min: 0 },
  qty: { type: Number, required: true, min: 1, max: 100 },
  subtotal: { type: Number, required: true, min: 0 },
  note: { type: String, trim: true, maxlength: 100 },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
  },
  table: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table',
    default: null,
  },
  tableNumber: {
    type: Number,
    default: null,
  },
  orderType: {
    type: String,
    enum: ['dine-in', 'takeaway', 'delivery'],
    default: 'dine-in',
    required: true,
  },
  items: {
    type: [orderItemSchema],
    validate: {
      validator: (v) => v && v.length > 0,
      message: 'Order must have at least one item',
    },
  },
  subtotal: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  discountType: {
    type: String,
    enum: ['fixed', 'percentage'],
    default: 'fixed',
  },
  // Tax and service charge are kept in schema for backward compatibility
  // but are always set to 0 — price shown on menu is the final price
  taxRate: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  serviceCharge: { type: Number, default: 0 },
  total: { type: Number, required: true, min: 0 },
  paymentMethod: {
    type: String,
    enum: ['cash', 'qr', 'card', 'credit', 'pending'],
    default: 'pending',
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid', 'refunded', 'partial'],
    default: 'unpaid',
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'],
    default: 'pending',
  },
  cashier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  cashierName: { type: String },
  customerName: { type: String, trim: true, maxlength: 100, default: '' },
  customerPhone: { type: String, trim: true, default: '' },
  note: {
    type: String,
    trim: true,
    maxlength: [500, 'Note cannot exceed 500 characters'],
    default: '',
  },
  paidAt: { type: Date },
  cancelledAt: { type: Date },
  cancelReason: { type: String, trim: true, maxlength: 200 },
  amountReceived: { type: Number, default: 0 },
  changeGiven: { type: Number, default: 0 },
  // QR self-ordering fields
  isQROrder: { type: Boolean, default: false },
  source: { type: String, enum: ['pos', 'qr'], default: 'pos' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Auto-generate orderId before save
orderSchema.pre('save', async function () {
  if (!this.orderId) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderId = `ORD-${String(count + 1001).padStart(4, '0')}`;
  }
  // Recalculate subtotals per item
  this.items.forEach(item => {
    item.subtotal = item.price * item.qty;
  });
  // Always zero out tax and service charge
  this.taxRate = 0;
  this.taxAmount = 0;
  this.serviceCharge = 0;
});

// Indexes for fast queries
orderSchema.index({ createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ table: 1, paymentStatus: 1 });
orderSchema.index({ cashier: 1 });
orderSchema.index({ paymentMethod: 1, createdAt: -1 });
orderSchema.index({ customerName: 1 });
orderSchema.index({ customerPhone: 1 });
// Compound index for dashboard queries
orderSchema.index({ createdAt: -1, paymentStatus: 1, paymentMethod: 1 });

module.exports = mongoose.model('Order', orderSchema);