const express = require('express');
const router = express.Router();
const { Receiver } = require('@upstash/qstash');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');
const { sendLowBalanceAlert, sendRecurringReminder, sendMonthlySummary } = require('../services/emailService');

// ─── QStash Signature Verification Middleware ─────────────────────────────────

const receiver = new Receiver({
  currentSigningKey:  process.env.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey:     process.env.QSTASH_NEXT_SIGNING_KEY,
});

const verifyQStash = async (req, res, next) => {
  try {
    const signature = req.headers['upstash-signature'];
    if (!signature) {
      return res.status(401).json({ message: 'Missing QStash signature' });
    }

    const isValid = await receiver.verify({
      signature,
      body: JSON.stringify(req.body),
    });

    if (!isValid) {
      return res.status(401).json({ message: 'Invalid QStash signature' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: 'QStash verification failed', error: err.message });
  }
};

// ─── Helper: Calculate next due date based on frequency ──────────────────────

const getNextDueDate = (startDate, frequency) => {
  const now = new Date();
  const due = new Date(startDate);

  while (due <= now) {
    switch (frequency) {
      case 'daily':   due.setDate(due.getDate() + 1);        break;
      case 'weekly':  due.setDate(due.getDate() + 7);        break;
      case 'monthly': due.setMonth(due.getMonth() + 1);      break;
      case 'yearly':  due.setFullYear(due.getFullYear() + 1); break;
      default: return null;
    }
  }
  return due;
};

const dayRange = (date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// ─── POST /api/cron/low-balance ───────────────────────────────────────────────

router.post('/low-balance', verifyQStash, async (req, res) => {
  console.log('⏰ [CRON] Running daily low balance check...');
  try {
    const users = await User.find({});

    for (const user of users) {
      const settings = await Settings.findOne({ userId: user._id });
      if (!settings) continue;

      const { lowBalanceAlert, lowBalanceThreshold } = settings.notifications;
      if (!lowBalanceAlert) continue;

      const transactions = await Transaction.find({ userId: user._id });
      const balance = transactions.reduce((acc, t) => {
        return t.type === 'income' ? acc + t.amount : acc - t.amount;
      }, 0);

      if (balance < lowBalanceThreshold) {
        await sendLowBalanceAlert({
          email:     user.email,
          name:      user.name,
          balance,
          threshold: lowBalanceThreshold,
          currency:  settings.currency
        });
        console.log(`✅ Low balance alert sent to ${user.email}`);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Low balance job failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/cron/recurring ─────────────────────────────────────────────────

router.post('/recurring', verifyQStash, async (req, res) => {
  console.log('⏰ [CRON] Running recurring transactions check...');
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { start, end } = dayRange(tomorrow);

    const users = await User.find({});

    for (const user of users) {
      const settings = await Settings.findOne({ userId: user._id });
      if (!settings) continue;

      const { recurringReminders } = settings.notifications;
      if (!recurringReminders) continue;

      const allRecurring = await Transaction.find({
        userId:                  user._id,
        'recurring.isRecurring': true
      });

      const recurringTxns = allRecurring.filter(t => {
        if (t.recurring.endDate && new Date(t.recurring.endDate) < tomorrow) return false;
        const nextDue = getNextDueDate(t.date, t.recurring.frequency);
        if (!nextDue) return false;
        return nextDue >= start && nextDue <= end;
      });

      if (recurringTxns.length === 0) continue;

      await sendRecurringReminder({
        email:        user.email,
        name:         user.name,
        transactions: recurringTxns,
        currency:     settings.currency
      });
      console.log(`✅ Recurring reminder sent to ${user.email}`);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Recurring job failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/cron/monthly-summary ──────────────────────────────────────────

router.post('/monthly-summary', verifyQStash, async (req, res) => {
  console.log('⏰ [CRON] Running monthly summary...');
  try {
    const now = new Date();
    const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastOfLastMonth  = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const month = firstOfLastMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    const users = await User.find({});

    for (const user of users) {
      const settings = await Settings.findOne({ userId: user._id });
      if (!settings) continue;

      const { monthlySummary } = settings.notifications;
      if (!monthlySummary) continue;

      const transactions = await Transaction.find({
        userId: user._id,
        date:   { $gte: firstOfLastMonth, $lte: lastOfLastMonth }
      });

      if (transactions.length === 0) continue;

      const totalIncome   = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      const netBalance    = totalIncome - totalExpenses;

      const byCategory = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + t.amount;
          return acc;
        }, {});

      await sendMonthlySummary({
        email: user.email,
        name:  user.name,
        month,
        totalIncome,
        totalExpenses,
        netBalance,
        byCategory,
        currency: settings.currency
      });
      console.log(`✅ Monthly summary sent to ${user.email}`);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Monthly summary job failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;