const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
   enum: [
  'Tea', 'Coffee', 'Tea Alternatives', 'Lassi', 'Hookah',
  'Veg Snacks', 'Non-Veg Snacks', 'Breakfast', 'Sandwich',
  'Burger', 'Fried Rice', 'Chowmein', 'Momo','Cigarettes', 'Other',
],
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    max: [100000, 'Price seems too high'],
  },
  emoji: {
    type: String,
    default: '🍽️',
    maxlength: [10, 'Emoji cannot exceed 10 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [300, 'Description cannot exceed 300 characters'],
    default: '',
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  costPrice: {
    type: Number,
    min: 0,
    default: 0,
  },
  preparationTime: {
    type: Number, // in minutes
    default: 5,
    min: 0,
    max: 120,
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  soldCount: {
    type: Number,
    default: 0,
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

// Virtual: profit margin
menuItemSchema.virtual('profitMargin').get(function () {
  if (!this.costPrice || this.costPrice === 0) return null;
  return (((this.price - this.costPrice) / this.price) * 100).toFixed(1);
});

// Indexes
menuItemSchema.index({ category: 1, isAvailable: 1, isDeleted: 1 });
menuItemSchema.index({ name: 'text', description: 'text' });
menuItemSchema.index({ soldCount: -1 });

const MenuItem =
  mongoose.models.MenuItem ||
  mongoose.model('MenuItem', menuItemSchema);

module.exports = MenuItem;
