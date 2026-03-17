const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'CashFlow Monitor <onboarding@resend.dev>';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatAmount = (amount, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

const baseTemplate = (title, content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    .header { background: #0f766e; padding: 28px 32px; }
    .header h1 { margin: 0; color: #ffffff; font-size: 20px; font-weight: 600; }
    .header p { margin: 4px 0 0; color: #99f6e4; font-size: 13px; }
    .body { padding: 28px 32px; color: #374151; font-size: 15px; line-height: 1.6; }
    .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 20px; margin: 16px 0; }
    .card .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .card .value { font-size: 22px; font-weight: 700; color: #111827; }
    .card .value.danger { color: #dc2626; }
    .card .value.success { color: #059669; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    td { padding: 10px 0; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6; }
    td.amount { text-align: right; font-weight: 600; }
    td.amount.income { color: #059669; }
    td.amount.expense { color: #dc2626; }
    .footer { padding: 20px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>CashFlow💰 Monitor</h1>
      <p>${title}</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">© ${new Date().getFullYear()} CashFlow Monitor · You're receiving this because you enabled email alerts.</div>
  </div>
</body>
</html>`;

// ─── Template 1: Low Balance Alert ───────────────────────────────────────────

const lowBalanceTemplate = ({ name, balance, threshold, currency }) => {
  const content = `
    <p>Hi ${name},</p>
    <p>Your current balance has dropped below your alert threshold of <strong>${formatAmount(threshold, currency)}</strong>.</p>
    <div class="card">
      <div class="label">Current Balance</div>
      <div class="value danger">${formatAmount(balance, currency)}</div>
    </div>
    <p style="color:#6b7280; font-size:13px;">Consider reviewing your recent expenses or adding income to stay on track.</p>
  `;
  return baseTemplate('⚠️ Low Balance Alert', content);
};

// ─── Template 2: Recurring Transaction Reminder ───────────────────────────────

const recurringReminderTemplate = ({ name, transactions, currency }) => {
  const rows = transactions.map(t => `
    <tr>
      <td>${t.note || t.category}</td>
      <td>${t.category}</td>
      <td>${t.recurring.frequency}</td>
      <td class="amount ${t.type}">${t.type === 'expense' ? '-' : '+'}${formatAmount(t.amount, currency)}</td>
    </tr>
  `).join('');

  const content = `
    <p>Hi ${name},</p>
    <p>You have <strong>${transactions.length} recurring transaction(s)</strong> due tomorrow. Here's a quick heads-up:</p>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Category</th>
            <th>Frequency</th>
            <th style="text-align:right">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p style="color:#6b7280; font-size:13px;">Make sure your account has sufficient funds for upcoming expenses.</p>
  `;
  return baseTemplate('🔁 Recurring Transactions Due Tomorrow', content);
};

// ─── Template 3: Monthly Summary ─────────────────────────────────────────────

const monthlySummaryTemplate = ({ name, month, totalIncome, totalExpenses, netBalance, byCategory, currency }) => {
  const categoryRows = Object.entries(byCategory).map(([cat, amount]) => `
    <tr>
      <td>${cat}</td>
      <td class="amount expense">${formatAmount(amount, currency)}</td>
    </tr>
  `).join('');

  const content = `
    <p>Hi ${name},</p>
    <p>Here's your financial summary for <strong>${month}</strong>:</p>
    <div class="card">
      <table>
        <tbody>
          <tr>
            <td>Total Income</td>
            <td class="amount income">+${formatAmount(totalIncome, currency)}</td>
          </tr>
          <tr>
            <td>Total Expenses</td>
            <td class="amount expense">-${formatAmount(totalExpenses, currency)}</td>
          </tr>
          <tr>
            <td><strong>Net Balance</strong></td>
            <td class="amount ${netBalance >= 0 ? 'income' : 'expense'}">
              ${netBalance >= 0 ? '+' : ''}${formatAmount(netBalance, currency)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    ${categoryRows ? `
    <p style="margin-top:20px"><strong>Expenses by Category</strong></p>
    <div class="card">
      <table>
        <thead><tr><th>Category</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>${categoryRows}</tbody>
      </table>
    </div>` : ''}
    <p style="color:#6b7280; font-size:13px;">Keep it up — small steps lead to big financial wins! 💪</p>
  `;
  return baseTemplate(`📊 Monthly Summary — ${month}`, content);
};

// ─── Send Functions ───────────────────────────────────────────────────────────

const sendLowBalanceAlert = async ({ email, name, balance, threshold, currency }) => {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: `⚠️ Low Balance Alert — Your balance is ${formatAmount(balance, currency)}`,
    html: lowBalanceTemplate({ name, balance, threshold, currency })
  });
};

const sendRecurringReminder = async ({ email, name, transactions, currency }) => {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: `🔁 Reminder: ${transactions.length} recurring transaction(s) due tomorrow`,
    html: recurringReminderTemplate({ name, transactions, currency })
  });
};

const sendMonthlySummary = async ({ email, name, month, totalIncome, totalExpenses, netBalance, byCategory, currency }) => {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: `📊 Your Monthly Summary for ${month} is ready`,
    html: monthlySummaryTemplate({ name, month, totalIncome, totalExpenses, netBalance, byCategory, currency })
  });
};

module.exports = { sendLowBalanceAlert, sendRecurringReminder, sendMonthlySummary };