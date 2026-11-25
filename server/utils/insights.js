// Pure functions behind the health score. They take plain numbers and arrays,
// never touch the database, and are easy to reason about and unit test.
//
// The score deliberately ignores how often or how promptly someone logs things
// and does not extrapolate from part of a month, because manual tracking is
// often caught up in batches and those signals would only punish that.

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

function gradeFor(score) {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs attention';
}

/**
 * Financial health score out of 100, from three transparent parts:
 *   savings rate 45 · budget discipline 30 · goal progress 25
 * Every part carries a plain-language hint so the score is explainable, not a black box.
 *
 * `income` and `expenses` cover whatever period the caller chose (normally up to
 * three completed months, so one unlogged week cannot distort them).
 */
function computeHealthScore({ income, expenses, budgets, goals }) {
  const components = [];

  // 1. Savings rate (45): full marks at 20% of income kept.
  if (income > 0) {
    const rate = (income - expenses) / income;
    let hint;
    if (rate >= 0.2) hint = `You keep ${Math.round(rate * 100)}% of what you earn.`;
    else if (rate >= 0) hint = `You keep ${Math.round(rate * 100)}% of what you earn. Aim for 20%.`;
    else hint = 'You are spending more than you earn.';
    components.push({ key: 'savings', label: 'Savings rate', points: clamp(rate / 0.2, 0, 1) * 45, max: 45, hint });
  } else {
    components.push({ key: 'savings', label: 'Savings rate', points: 0, max: 45, hint: 'Add your income to measure how much you keep.' });
  }

  // 2. Budget discipline (30): a budget already over its limit is over, however much is still to be logged.
  if (budgets.length) {
    const within = budgets.filter(b => b.spent <= b.amount).length;
    components.push({
      key: 'budgets', label: 'Budget discipline', points: (within / budgets.length) * 30, max: 30,
      hint: `${within} of ${budgets.length} budgets are within their limit this month.`
    });
  } else {
    components.push({ key: 'budgets', label: 'Budget discipline', points: 10, max: 30, hint: 'Set a few budgets to earn up to 20 more points.' });
  }

  // 3. Goal progress (25)
  if (goals.length) {
    const avg = goals.reduce((s, g) => s + clamp(g.savedAmount / g.targetAmount, 0, 1), 0) / goals.length;
    components.push({
      key: 'goals', label: 'Goal progress', points: clamp(6 + avg * 19, 0, 25), max: 25,
      hint: `Your goals are ${Math.round(avg * 100)}% funded on average.`
    });
  } else {
    components.push({ key: 'goals', label: 'Goal progress', points: 6, max: 25, hint: 'Create a savings goal to earn up to 19 more points.' });
  }

  const rounded = components.map(c => ({ ...c, points: Math.round(c.points * 10) / 10 }));
  const value = Math.round(rounded.reduce((s, c) => s + c.points, 0));
  return { value, grade: gradeFor(value), components: rounded };
}

/** Rounds a suggested budget up to a tidy number. */
function niceRound(n) {
  const step = n >= 10000 ? 500 : n >= 1000 ? 100 : n >= 200 ? 50 : 10;
  return Math.ceil(n / step) * step;
}

module.exports = { clamp, gradeFor, computeHealthScore, niceRound };
