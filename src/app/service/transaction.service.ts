import { Injectable } from '@angular/core';
import { Transaction } from '../models/transaction.interface';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private readonly storageKey = 'transactions';

  private transactionsSubject = new BehaviorSubject<Transaction[]>(this.getTransactionsFromStorage());
  transactions$ = this.transactionsSubject.asObservable();

  constructor() { }

  saveTransaction(transaction: Transaction): void {
    const transactions = this.getTransactionsFromStorage();
    transactions.push(transaction);
    this.updateLocalStorage(transactions);
  }

  getTransactions(): Transaction[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }


  getBalance(): number {
    const transactions = this.transactionsSubject.value;

    if (transactions.length === 0) return 0;

    const totalIncome = transactions
      .filter(transaction => transaction.transactionType === 'Income')
      .reduce((sum, transaction) => sum + +(transaction.amount), 0);

    const totalExpense = transactions
      .filter(transaction => transaction.transactionType === 'Expense')
      .reduce((sum, transaction) => sum + +(transaction.amount), 0);

    return +(totalIncome - totalExpense).toFixed(2);
  }

  private getTransactionsFromStorage(): Transaction[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  private updateLocalStorage(transactions: Transaction[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(transactions));
    this.transactionsSubject.next(transactions);

  }

}
