const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  number: {
    type: Number,
    required: [true, 'Table number is required'],
    unique: true,
    min: [1, 'Table number must be at least 1'],
    max: [200, 'Table number cannot exceed 200'],
  },
  seats: {
    type: Number,
    required: [true, 'Seat count is required'],
    min: [1, 'Must have at least 1 seat'],
    max: [20, 'Cannot exceed 20 seats'],
    default: 4,
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved', 'dirty'],
    default: 'available',
  },
  currentOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null,
  },
  location: {
    type: String,
    enum: ['Garden', 'Hall', 'Cabin'],
    default: 'Hall',
  },
  reservedFor: {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    time: { type: Date },
    partySize: { type: Number },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [200, 'Notes cannot exceed 200 characters'],
  },
  // QR self-ordering token — unique per table, used in QR URL
  qrToken: {
    type: String,
    unique: true,
    sparse: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

tableSchema.index({ status: 1, isActive: 1 });
// tableSchema.index({ number: 1 });
// tableSchema.index({ qrToken: 1 });

module.exports = mongoose.model('Table', tableSchema);
