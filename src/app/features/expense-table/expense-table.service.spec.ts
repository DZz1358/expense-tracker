import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { authInterceptor } from '../../core/interceptors/auth.interceptor';
import { AuthTokenStorageService } from '../../core/services/auth-token-storage.service';
import { IExpense } from '../../models/expense.interface';
import { ExpenseQuery } from '../../models/expense-query.models';
import { EMPTY_EXPENSE_SUMMARY } from '../analytics/analytics.service';
import { ExpenseTableService } from './expense-table.service';

describe('ExpenseTableService QUERY requests', () => {
  let service: ExpenseTableService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      provideRouter([]),
    ] });
    service = TestBed.inject(ExpenseTableService);
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthTokenStorageService).setToken('token-123');
  });

  afterEach(() => { http.verify(); localStorage.clear(); });

  it('sends an empty JSON body with bearer authentication for the default list', () => {
    service.queryExpenses().subscribe();
    const request = http.expectOne(`${environment.apiUrl}/expenses`);
    expect(request.request.method).toBe('QUERY');
    expect(request.request.body).toEqual({});
    expect(request.request.headers.get('Content-Type')).toBe('application/json');
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-123');
    request.flush({ items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
  });

  it('preserves multiple categories, UTC date strings, zero amounts and false booleans', () => {
    const filters: ExpenseQuery = {
      category: ['food', 'transport'], dateFrom: '2026-09-01', dateTo: '2026-09-30',
      minAmount: 0, maxAmount: 100, q: 'coffee', hasAttachment: false,
      page: 2, limit: 100, sortBy: 'amount', sortOrder: 'asc',
    };
    service.queryExpenses(filters).subscribe();
    const request = http.expectOne(`${environment.apiUrl}/expenses`);
    expect(request.request.body).toEqual(filters);
    expect(request.request.urlWithParams).toBe(`${environment.apiUrl}/expenses`);
    request.flush({ items: [], pagination: { page: 2, limit: 100, total: 0, totalPages: 0 } });
  });

  it('omits null, undefined and empty optional fields', () => {
    service.queryExpenses({
      category: [], dateFrom: null, dateTo: undefined, q: '', minAmount: 0, hasAttachment: false,
    } as unknown as ExpenseQuery).subscribe();
    const request = http.expectOne(`${environment.apiUrl}/expenses`);
    expect(request.request.body).toEqual({ minAmount: 0, hasAttachment: false });
    request.flush({ items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
  });

  it('requests the complete-selection summary with the same filters', () => {
    service.querySummary({ category: 'food', hasAttachment: true }).subscribe((summary) => {
      expect(summary.total).toBe(200);
      expect(summary.totalAmount).toBe(5000);
    });
    const request = http.expectOne(`${environment.apiUrl}/expenses/summary`);
    expect(request.request.method).toBe('QUERY');
    expect(request.request.body).toEqual({ category: 'food', hasAttachment: true });
    expect(request.request.headers.get('Content-Type')).toBe('application/json');
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-123');
    request.flush({ ...EMPTY_EXPENSE_SUMMARY, total: 200, totalAmount: 5000 });
  });

  it('loads every page for account-wide operations and stops at the last page', () => {
    const first = { id: 'first' } as IExpense;
    const second = { id: 'second' } as IExpense;
    let result: IExpense[] | undefined;
    service.getAllExpenses({ category: 'food' }).subscribe((expenses) => result = expenses);
    const pageOne = http.expectOne(`${environment.apiUrl}/expenses`);
    expect(pageOne.request.body).toEqual({ category: 'food', limit: 100 });
    pageOne.flush({ items: [first], pagination: { page: 1, limit: 100, total: 101, totalPages: 2 } });
    expect(result).toBeUndefined();
    const pageTwo = http.expectOne(`${environment.apiUrl}/expenses`);
    expect(pageTwo.request.body).toEqual({ category: 'food', page: 2, limit: 100 });
    pageTwo.flush({ items: [second], pagination: { page: 2, limit: 100, total: 101, totalPages: 2 } });
    expect(result).toEqual([first, second]);
  });
});
