const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  cafeName: { type: String, default: 'Chiya Chowk', trim: true, maxlength: 100 },
  address: { type: String, default: 'Kathmandu, Nepal', trim: true, maxlength: 200 },
  phone: { type: String, default: '+977-01-000000', trim: true },
  email: { type: String, default: '', trim: true },
  vatNumber: { type: String, default: '', trim: true },
  vatRate: { type: Number, default: 13, min: 0, max: 100 },
  serviceChargeRate: { type: Number, default: 10, min: 0, max: 100 },
  currency: { type: String, default: 'NPR' },
  currencySymbol: { type: String, default: 'Rs.' },
  openingTime: { type: String, default: '07:00' },
  closingTime: { type: String, default: '21:00' },
  receiptFooter: { type: String, default: 'Thank you for visiting Chiya Chowk! चिया पिउनु भयो, मुस्कान ल्याउनु भयो 😊', maxlength: 300 },
  logoUrl: { type: String, default: '' },
  isOpen: { type: Boolean, default: true },
  allowReservations: { type: Boolean, default: true },
  maxTablesCount: { type: Number, default: 20 },
  printReceipt: { type: Boolean, default: true },
  enableServiceCharge: { type: Boolean, default: true },
  enableVAT: { type: Boolean, default: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Settings', settingsSchema);