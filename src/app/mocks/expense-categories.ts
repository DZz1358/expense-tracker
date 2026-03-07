export const EXPENSE_CATEGORY = {
  HOUSING: 'housing',
  GROCERIES: 'groceries',
  DINING_OUT: 'dining_out',
  TRANSPORT: 'transport',
  HEALTH: 'health',
  SUBSCRIPTIONS: 'subscriptions',
  SHOPPING: 'shopping',
  PERSONAL_CARE: 'personal_care',
  ENTERTAINMENT: 'entertainment',
  EDUCATION: 'education',
  TRAVEL: 'travel',
  FINANCE: 'finance',
} as const;

export type ExpenseCategory =
  typeof EXPENSE_CATEGORY[keyof typeof EXPENSE_CATEGORY];

export interface ExpenseCategoryMeta {
  label: string;
  icon: string;
  color: string;
}

export const EXPENSE_CATEGORY_META: Record<ExpenseCategory, ExpenseCategoryMeta> = {
  [EXPENSE_CATEGORY.HOUSING]: {
    label: 'Housing',
    icon: 'home',
    color: '#6D4C41',
  },
  [EXPENSE_CATEGORY.GROCERIES]: {
    label: 'Groceries',
    icon: 'shopping_cart',
    color: '#43A047',
  },
  [EXPENSE_CATEGORY.DINING_OUT]: {
    label: 'Dining Out',
    icon: 'restaurant',
    color: '#FB8C00',
  },
  [EXPENSE_CATEGORY.TRANSPORT]: {
    label: 'Transport',
    icon: 'directions_car',
    color: '#1E88E5',
  },
  [EXPENSE_CATEGORY.HEALTH]: {
    label: 'Health',
    icon: 'local_hospital',
    color: '#E53935',
  },
  [EXPENSE_CATEGORY.SUBSCRIPTIONS]: {
    label: 'Subscriptions',
    icon: 'subscriptions',
    color: '#8E24AA',
  },
  [EXPENSE_CATEGORY.SHOPPING]: {
    label: 'Shopping',
    icon: 'shopping_bag',
    color: '#D81B60',
  },
  [EXPENSE_CATEGORY.PERSONAL_CARE]: {
    label: 'Personal Care',
    icon: 'spa',
    color: '#EC407A',
  },
  [EXPENSE_CATEGORY.ENTERTAINMENT]: {
    label: 'Entertainment',
    icon: 'movie',
    color: '#5E35B1',
  },
  [EXPENSE_CATEGORY.EDUCATION]: {
    label: 'Education',
    icon: 'school',
    color: '#3949AB',
  },
  [EXPENSE_CATEGORY.TRAVEL]: {
    label: 'Travel',
    icon: 'flight',
    color: '#00ACC1',
  },
  [EXPENSE_CATEGORY.FINANCE]: {
    label: 'Finance',
    icon: 'account_balance_wallet',
    color: '#546E7A',
  },
};

export const EXPENSE_CATEGORY_LIST = Object.entries(EXPENSE_CATEGORY_META).map(
  ([id, meta]) => ({
    id: id as ExpenseCategory,
    ...meta,
  }),
);

export function getExpenseCategoryMeta(
  category: ExpenseCategory | null | undefined,
): ExpenseCategoryMeta | null {
  if (!category) return null;
  return EXPENSE_CATEGORY_META[category] ?? null;
}

export function getExpenseCategoryIcon(
  category: ExpenseCategory | null | undefined,
): string {
  return getExpenseCategoryMeta(category)?.icon ?? 'category';
}

export function getExpenseCategoryLabel(
  category: ExpenseCategory | null | undefined,
): string {
  return getExpenseCategoryMeta(category)?.label ?? 'Other';
}

export function getExpenseCategoryColor(
  category: ExpenseCategory | null | undefined,
): string {
  return getExpenseCategoryMeta(category)?.color ?? '#9E9E9E';
}
