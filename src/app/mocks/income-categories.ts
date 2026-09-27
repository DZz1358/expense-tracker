import { ExpenseCategoryMeta } from './expense-categories';

export const INCOME_CATEGORY = {
  SALARY: 'salary',
  SIDE_JOB: 'side_job',
  BENEFITS: 'benefits',
  REFUND: 'refund',
  GIFTS: 'gifts',
  OTHER_INCOME: 'other_income',
} as const;

export type IncomeCategory =
  typeof INCOME_CATEGORY[keyof typeof INCOME_CATEGORY];

/**
 * Built-in categories for `type: 'income'` operations. Ids share one namespace
 * with the expense catalogue (categories are looked up by id alone), which is
 * why the fallback bucket is `other_income` rather than a second `other`.
 */
export const INCOME_CATEGORY_META: Record<IncomeCategory, ExpenseCategoryMeta> = {
  [INCOME_CATEGORY.SALARY]: {
    label: 'Salary',
    icon: 'payments',
    color: '#2E7D32',
  },
  [INCOME_CATEGORY.SIDE_JOB]: {
    label: 'Side Job',
    icon: 'work',
    color: '#00897B',
  },
  [INCOME_CATEGORY.BENEFITS]: {
    label: 'Benefits',
    icon: 'volunteer_activism',
    color: '#7CB342',
  },
  [INCOME_CATEGORY.REFUND]: {
    label: 'Refund',
    icon: 'currency_exchange',
    color: '#00ACC1',
  },
  [INCOME_CATEGORY.GIFTS]: {
    label: 'Gifts',
    icon: 'redeem',
    color: '#D81B60',
  },
  [INCOME_CATEGORY.OTHER_INCOME]: {
    label: 'Other',
    icon: 'category',
    color: '#78909C',
  },
};

export const INCOME_CATEGORY_LIST = Object.entries(INCOME_CATEGORY_META).map(
  ([id, meta]) => ({
    id: id as IncomeCategory,
    type: 'income' as const,
    ...meta,
  }),
);
