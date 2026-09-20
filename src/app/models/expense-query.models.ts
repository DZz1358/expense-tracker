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

/**
 * The `biggestExpense` projection of `QUERY /expenses/summary`. It is deliberately
 * NOT `IExpense`: the aggregation rebuilds the document by hand, so it carries no
 * `userId`/`updatedAt` and returns explicit `null` where `IExpense` declares
 * optional fields.
 */
export interface ExpenseSummaryItem {
  id: string;
  amount: number;
  category: string;
  expenseDate: string;
  description: string | null;
  attachmentUrl: string | null;
  createdAt: string | null;
}

export interface ExpenseSummary {
  total: number;
  totalAmount: number;
  byCategory: Array<{ category: string; total: number; totalAmount: number }>;
  byDate: Array<{ date: string; total: number; totalAmount: number }>;
  activeDays: number;
  biggestExpense: ExpenseSummaryItem | null;
}

export function expenseQueryBody(query: ExpenseQuery): ExpenseQuery {
  return Object.fromEntries(Object.entries(query).filter(([, value]) =>
    value !== undefined && value !== null && value !== '' &&
    (!Array.isArray(value) || value.length > 0),
  ));
}

/**
 * `Other` was the only built-in category historically persisted with an
 * uppercase first letter. Query both spellings until those records are
 * migrated on the backend.
 */
export function legacyCompatibleCategoryFilter(category: string): string | string[] | undefined {
  const value = category.trim();
  if (!value) return undefined;
  return value.toLowerCase() === 'other' ? ['other', 'Other'] : value;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function asText(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asDateKey(value: unknown): string {
  return typeof value === 'string' && value.length >= 10 ? value.slice(0, 10) : '';
}

function asCategoryId(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function asSummaryItem(value: unknown): ExpenseSummaryItem | null {
  const raw = asRecord(value);
  if (typeof raw['id'] !== 'string') return null;
  return {
    id: raw['id'],
    amount: asNumber(raw['amount']),
    category: asCategoryId(raw['category']),
    expenseDate: asText(raw['expenseDate']) ?? '',
    description: asText(raw['description']),
    attachmentUrl: asText(raw['attachmentUrl']),
    createdAt: asText(raw['createdAt']),
  };
}

/**
 * Repairs any summary body into the declared contract. Never throws: an older
 * backend that omits byDate / activeDays / biggestExpense degrades to an empty
 * timeline instead of freezing the analytics page.
 *
 * Buckets are canonicalized, merged and sorted here as insurance against a
 * version skew between the two deployments and legacy `Other` category casing.
 */
export function normalizeExpenseSummary(body: unknown): ExpenseSummary {
  const raw = asRecord(body);
  const categoryTotals = new Map<string, { total: number; totalAmount: number }>();
  for (const value of Array.isArray(raw['byCategory']) ? raw['byCategory'] : []) {
    const entry = asRecord(value);
    const category = asCategoryId(entry['category']);
    if (!category) continue;
    const previous = categoryTotals.get(category) ?? { total: 0, totalAmount: 0 };
    categoryTotals.set(category, {
      total: previous.total + asNumber(entry['total']),
      totalAmount: previous.totalAmount + asNumber(entry['totalAmount']),
    });
  }
  const byCategory = Array.from(categoryTotals, ([category, totals]) => ({ category, ...totals }))
    .sort((a, b) => b.totalAmount - a.totalAmount || a.category.localeCompare(b.category));

  const dateTotals = new Map<string, { total: number; totalAmount: number }>();
  for (const value of Array.isArray(raw['byDate']) ? raw['byDate'] : []) {
    const entry = asRecord(value);
    const date = asDateKey(entry['date']);
    if (!date) continue;
    const previous = dateTotals.get(date) ?? { total: 0, totalAmount: 0 };
    dateTotals.set(date, {
      total: previous.total + asNumber(entry['total']),
      totalAmount: previous.totalAmount + asNumber(entry['totalAmount']),
    });
  }
  const byDate = Array.from(dateTotals, ([date, totals]) => ({ date, ...totals }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const activeDays = raw['activeDays'];

  return {
    total: asNumber(raw['total']),
    totalAmount: asNumber(raw['totalAmount']),
    byCategory,
    byDate,
    activeDays: typeof activeDays === 'number' && Number.isFinite(activeDays)
      ? activeDays
      : byDate.length,
    biggestExpense: asSummaryItem(raw['biggestExpense']),
  };
}
