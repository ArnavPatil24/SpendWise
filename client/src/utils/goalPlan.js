export function calculateGoalPlan(goal, avgMonthlySavings = 0) {
  const target = Number(goal.targetAmount || 0);
  const saved = Number(goal.savedAmount || 0);
  const remaining = Math.max(0, target - saved);

  if (remaining === 0 || goal.status === 'completed') {
    return { isCompleted: true, monthlyNeeded: 0, monthsLeft: 0, feasibility: 'completed', message: 'Target reached' };
  }

  const today = new Date();
  const targetDate = new Date(goal.targetDate);
  let monthsLeft = (targetDate.getFullYear() - today.getFullYear()) * 12 + (targetDate.getMonth() - today.getMonth());
  if (targetDate.getDate() > today.getDate()) monthsLeft += 1;
  monthsLeft = Math.max(1, monthsLeft);

  const monthlyNeeded = Math.ceil(remaining / monthsLeft);

  let feasibility = 'moderate';
  let message = 'Steady monthly contributions will get you there';

  if (avgMonthlySavings > 0) {
    if (monthlyNeeded <= avgMonthlySavings * 0.75) {
      feasibility = 'easy';
      message = 'Fits comfortably within your monthly savings';
    } else if (monthlyNeeded <= avgMonthlySavings) {
      feasibility = 'moderate';
      message = 'Matches your current savings pace';
    } else {
      feasibility = 'ambitious';
      message = 'Ambitious: above your average monthly savings';
    }
  }

  return { isCompleted: false, monthlyNeeded, monthsLeft, feasibility, message };
}
