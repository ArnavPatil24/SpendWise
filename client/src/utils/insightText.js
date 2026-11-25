// Turns the server's structured insight data into short, readable cards.
// Kept separate so the Overview and the Insights page say the same thing.

export function buildInsightCards(data, fmt, fmtDate) {
  if (!data) return [];
  const { pace, movers, largest, weekday, noSpendDays } = data;
  const cards = [];

  if (!pace.reliable) {
    cards.push({ id: 'pace', tone: 'info', title: 'Too early to project', text: `Month-end projections start after day 5, once there is enough data. You have spent ${fmt(pace.spent)} so far.` });
  } else if (pace.lastMonth > 0 && pace.spent > 0) {
    const change = Math.round(((pace.projected - pace.lastMonth) / pace.lastMonth) * 100);
    cards.push(change <= 0
      ? { id: 'pace', tone: 'good', title: 'Spending is on a lighter pace', text: `At this rate you will spend about ${fmt(pace.projected)} this month, ${Math.abs(change)}% less than last month.` }
      : { id: 'pace', tone: change > 20 ? 'warn' : 'info', title: 'Spending is running ahead', text: `At this rate you will spend about ${fmt(pace.projected)} this month, ${change}% more than last month.` });
  } else if (pace.spent > 0) {
    cards.push({ id: 'pace', tone: 'info', title: 'Month-end projection', text: `You are spending about ${fmt(pace.dailyAverage)} a day, which projects to ${fmt(pace.projected)} by month end.` });
  }

  if (pace.reliable && pace.budgetTotal && pace.spent > 0) {
    const gap = pace.budgetTotal - pace.projected;
    cards.push(gap >= 0
      ? { id: 'budget', tone: 'good', title: 'On track for your budgets', text: `Your projected spending is ${fmt(gap)} under your combined budgets of ${fmt(pace.budgetTotal)}.` }
      : { id: 'budget', tone: 'warn', title: 'Budgets may be exceeded', text: `Projected spending is ${fmt(-gap)} over your combined budgets of ${fmt(pace.budgetTotal)}.` });
  }

  if (movers.up) {
    const pct = movers.up.percent === null ? 'new this month' : `up ${movers.up.percent}%`;
    cards.push({ id: 'up', tone: 'warn', title: `${movers.up.category} is ${pct}`, text: `You have spent ${fmt(movers.up.current)} here, ${fmt(movers.up.change)} more than last month.` });
  }
  if (movers.down) {
    cards.push({ id: 'down', tone: 'good', title: `You cut back on ${movers.down.category}`, text: `Spending is ${fmt(Math.abs(movers.down.change))} lower than last month (${fmt(movers.down.current)} vs ${fmt(movers.down.previous)}).` });
  }
  if (largest) {
    cards.push({ id: 'largest', tone: 'info', title: 'Biggest expense this month', text: `${largest.title} for ${fmt(largest.amount)} (${largest.category}) on ${fmtDate(largest.date)}.` });
  }
  if (weekday.top) {
    cards.push({ id: 'weekday', tone: 'info', title: `${weekday.top.day}s are your priciest day`, text: `Over the last 90 days you spent about ${fmt(weekday.top.average)} on an average ${weekday.top.day}.` });
  }
  if (pace.daysElapsed >= 3) {
    cards.push({
      id: 'nospend', tone: noSpendDays >= 5 ? 'good' : 'info',
      title: noSpendDays === 0 ? 'No no-spend days yet' : `${noSpendDays} no-spend day${noSpendDays === 1 ? '' : 's'} so far`,
      text: noSpendDays === 0 ? 'Try one day this week with no spending to build the habit.' : `You have gone ${noSpendDays} of ${pace.daysElapsed} days this month without spending anything.`
    });
  }
  return cards;
}
