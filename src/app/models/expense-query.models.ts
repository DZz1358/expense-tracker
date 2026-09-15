import { IExpense } from './expense.interface';

export type ExpenseSortBy = 'expenseDate' | 'amount' | 'category' | 'createdAt';
export type ExpenseSortOrder = 'asc' | 'desc';

export interface ExpenseFilters {
  category?: string | string[];
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  q?: string;
  hasAttachment?: boolean;
}

export interface ExpenseQuery extends ExpenseFilters {
  page?: number;
  limit?: number;
  sortBy?: ExpenseSortBy;
  sortOrder?: ExpenseSortOrder;
}

export interface ExpensePage {
  items: IExpense[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ExpenseSummary {
  total: number;
  totalAmount: number;
  byCategory: Array<{ category: string; total: number; totalAmount: number }>;
  byDate: Array<{ date: string; total: number; totalAmount: number }>;
  activeDays: number;
  biggestExpense: IExpense | null;
}

export function expenseQueryBody(query: ExpenseQuery): ExpenseQuery {
  return Object.fromEntries(Object.entries(query).filter(([, value]) =>
    value !== undefined && value !== null && value !== '' &&
    (!Array.isArray(value) || value.length > 0),
  ));
}
