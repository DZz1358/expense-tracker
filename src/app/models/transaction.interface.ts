export interface Transaction {
  title: string;
  transactionType: 'Income' | 'Expense';
  category: string;
  date: string;
  amount: number;
}
