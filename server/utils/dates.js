// Every date SpendWise stores is a calendar day saved at UTC midnight, so every
// boundary we compare against must be computed in UTC too. Using local-time
// constructors (new Date(y, m, 1)) shifts results by a day on servers that are
// not in UTC, which is why all month maths lives here.

const DAY_MS = 86400000;

/** First instant of a month. `month` is 1 to 12. */
const monthStart = (year, month) => new Date(Date.UTC(year, month - 1, 1));

/** Days in a month. `month` is 1 to 12. */
const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** Everything a controller needs to know about "this month". */
function monthContext(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  return {
    now,
    year,
    month,
    day: now.getUTCDate(),
    daysInMonth: daysInMonth(year, month),
    monthStart: monthStart(year, month),
    nextMonth: monthStart(year, month + 1),
    prevStart: monthStart(year, month - 1)
  };
}

/** The first of the month, `offset` months away from the given month start. */
const shiftMonths = (start, offset) => monthStart(start.getUTCFullYear(), start.getUTCMonth() + 1 + offset);

module.exports = { DAY_MS, monthStart, daysInMonth, monthContext, shiftMonths };
