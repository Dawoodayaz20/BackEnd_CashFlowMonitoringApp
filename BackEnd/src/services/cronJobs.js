const cron = require('node-cron');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');
const { sendLowBalanceAlert, sendRecurringReminder, sendMonthlySummary } = require('../services/emailService');

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Returns start and end of a given date (midnight to midnight)
const dayRange = (date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// ─── Job 1: Daily Low Balance Alert ──────────────────────────────────────────
// Runs every day at 8:00 AM

cron.schedule('0 8 * * *', async () => {
  console.log('⏰ [CRON] Running daily low balance check...');
  try {
    const users = await User.find({});

    for (const user of users) {
      const settings = await Settings.findOne({ userId: user._id });
      if (!settings) continue;

      const { lowBalanceAlert, lowBalanceThreshold } = settings.notifications;
      if (!lowBalanceAlert) continue;

      // Calculate current balance
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
        console.log(`✅ Low balance alert sent to ${user.email} (balance: ${balance})`);
      }
    }
  } catch (err) {
    console.error('❌ [CRON] Low balance job failed:', err.message);
  }
});

// ─── Helper: Calculate next due date based on frequency ──────────────────────

const getNextDueDate = (startDate, frequency) => {
  const now = new Date();
  const due = new Date(startDate);

  // Advance due date until it's in the future
  while (due <= now) {
    switch (frequency) {
      case 'daily':   due.setDate(due.getDate() + 1);       break;
      case 'weekly':  due.setDate(due.getDate() + 7);       break;
      case 'monthly': due.setMonth(due.getMonth() + 1);     break;
      case 'yearly':  due.setFullYear(due.getFullYear() + 1); break;
      default: return null;
    }
  }
  return due;
};

// ─── Job 2: Recurring Transaction Reminder ────────────────────────────────────
// Runs every day at 9:00 AM — alerts for transactions due tomorrow

cron.schedule('0 9 * * *', async () => {
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

      // Fetch all recurring transactions for this user
      const allRecurring = await Transaction.find({
        userId:                  user._id,
        'recurring.isRecurring': true
      });

      // Filter to those whose next due date falls tomorrow
      const recurringTxns = allRecurring.filter(t => {
        // Skip if past endDate
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
      console.log(`✅ Recurring reminder sent to ${user.email} (${recurringTxns.length} transactions)`);
    }
  } catch (err) {
    console.error('❌ [CRON] Recurring reminder job failed:', err.message);
  }
});

// ─── Job 3: Monthly Summary ───────────────────────────────────────────────────
// Runs on the 1st of every month at 7:00 AM

cron.schedule('0 7 1 * *', async () => {
  console.log('⏰ [CRON] Running monthly summary...');
  try {
    // Get last month's date range
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

      // Group expenses by category
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
      console.log(`✅ Monthly summary sent to ${user.email} for ${month}`);
    }
  } catch (err) {
    console.error('❌ [CRON] Monthly summary job failed:', err.message);
  }
});

console.log('✅ Cron jobs registered');