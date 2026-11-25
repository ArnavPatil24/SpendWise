// The categories every account starts with. Custom categories may not reuse these names.
const EXPENSE_CATEGORIES = [
  'Food & dining', 'Transport', 'Shopping', 'Entertainment', 'Bills & utilities',
  'Health', 'Education', 'Travel', 'Subscriptions', 'Other'
];
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Business', 'Investment', 'Gift', 'Other income'];
const GOAL_CATEGORIES = [
  'Emergency Fund', 'Tech & Gadgets', 'Education', 'Travel & Vacation', 'Vehicle', 'Home', 'Investment', 'Other'
];

const BUILT_IN_BY_TYPE = {
  expense: new Set(EXPENSE_CATEGORIES.map(name => name.toLowerCase())),
  income: new Set(INCOME_CATEGORIES.map(name => name.toLowerCase())),
  goal: new Set(GOAL_CATEGORIES.map(name => name.toLowerCase()))
};
const BUILT_IN_KEYS = new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES, ...GOAL_CATEGORIES].map(name => name.toLowerCase()));

// Icon keys a custom category may use. The client maps each key to an icon component.
const ICON_KEYS = [
  'tag', 'utensils', 'coffee', 'pizza', 'car', 'bus', 'fuel', 'shopping-bag', 'shirt', 'film', 'music',
  'gamepad', 'receipt', 'wifi', 'smartphone', 'heart-pulse', 'dumbbell', 'graduation-cap', 'book-open',
  'plane', 'home', 'gift', 'paw-print', 'baby', 'wrench', 'briefcase', 'laptop', 'store', 'trending-up',
  'wallet', 'hand-coins', 'sparkles'
];

module.exports = { EXPENSE_CATEGORIES, INCOME_CATEGORIES, GOAL_CATEGORIES, BUILT_IN_BY_TYPE, BUILT_IN_KEYS, ICON_KEYS };
