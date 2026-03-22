export interface IExpense {
  id: string;
  amount: number;
  category: string;
  expenseDate: string;
  description?: string;
  // paymentMethod?: 'cash' | 'card' | 'other';
  createdAt: string;
  attachmentUrl?: string;
}
