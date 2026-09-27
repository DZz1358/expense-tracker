export type OperationType = 'expense' | 'income';

export const OPERATION_TYPES: readonly OperationType[] = ['expense', 'income'];

export function isOperationType(value: unknown): value is OperationType {
  return value === 'expense' || value === 'income';
}

/**
 * An operation returned by `/operations`. `expenseDate` keeps its historical
 * name on the backend for both expenses and incomes.
 */
export interface IExpense {
  id: string;
  type: OperationType;
  amount: number;
  category: string;
  expenseDate: string;
  description?: string;
  // paymentMethod?: 'cash' | 'card' | 'other';
  createdAt: string;
  attachmentUrl?: string;
}
