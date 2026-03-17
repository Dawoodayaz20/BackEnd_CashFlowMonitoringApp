const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true  // one settings doc per user
  },
  currency: {
    type: String,
    enum: ['USD', 'EUR', 'GBP', 'PKR', 'AED'],
    default: 'USD'
  },
  dateFormat: {
    type: String,
    enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
    default: 'MM/DD/YYYY'
  },
  defaultPage: {
    type: String,
    default: '/dashboard'
  },
  budgetLimits: {
    Rent:          { type: Number, default: 0 },
    Food:          { type: Number, default: 0 },
    Transport:     { type: Number, default: 0 },
    Utilities:     { type: Number, default: 0 },
    Healthcare:    { type: Number, default: 0 },
    Entertainment: { type: Number, default: 0 },
    Subscriptions: { type: Number, default: 0 },
    Other:         { type: Number, default: 0 },
  },
  notifications: {
    lowBalanceAlert:     { type: Boolean, default: true  },
    lowBalanceThreshold: { type: Number,  default: 100   },
    monthlySummary:      { type: Boolean, default: true  },
    recurringReminders:  { type: Boolean, default: false },
  }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);