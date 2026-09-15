import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { EMPTY, Observable, expand, reduce } from 'rxjs';

import { environment } from '../../../environments/environment';
import { IExpense } from '../../models/expense.interface';
import { ExpenseFilters, ExpensePage, ExpenseQuery, ExpenseSummary, expenseQueryBody } from '../../models/expense-query.models';

@Injectable({
  providedIn: 'root',
})
export class ExpenseTableService {
  private http = inject(HttpClient);

  queryExpenses(filters: ExpenseQuery = {}): Observable<ExpensePage> {
    return this.http.request<ExpensePage>('QUERY', `${environment.apiUrl}/expenses`, {
      body: expenseQueryBody(filters),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  querySummary(filters: ExpenseFilters = {}): Observable<ExpenseSummary> {
    return this.http.request<ExpenseSummary>('QUERY', `${environment.apiUrl}/expenses/summary`, {
      body: expenseQueryBody(filters),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  getAllExpenses(filters: ExpenseFilters = {}): Observable<IExpense[]> {
    return this.queryExpenses({ ...filters, limit: 100 }).pipe(
      expand((response) => response.pagination.page < response.pagination.totalPages
        ? this.queryExpenses({ ...filters, page: response.pagination.page + 1, limit: 100 })
        : EMPTY),
      reduce((expenses, response) => expenses.concat(response.items), [] as IExpense[]),
    );
  }

  addExpense(data: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/expenses`, {
      ...data
    })
  }
  updateExpense(data: any): Observable<any> {
    return this.http.patch(`${environment.apiUrl}/expenses/${data.id}`, {
      ...data
    })
  }

  deleteExpense(id: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/expenses/${id}`);
  }
}
