import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../../environments/environment';
import { IExpense } from '../../models/expense.interface';
import { ViewportServiceService } from '../../core/services/viewport-service.service';
import { ExpenseTableComponent } from './expense-table.component';

describe('ExpenseTableComponent server pagination', () => {
  let component: ExpenseTableComponent;
  let fixture: ComponentFixture<ExpenseTableComponent>;
  let http: HttpTestingController;
  const expense: IExpense = {
    id: 'expense-1', amount: 10, category: 'food', description: 'Coffee',
    expenseDate: '2026-09-01T00:00:00Z', createdAt: '2026-09-01T00:00:00Z',
  };

  const respond = async (items: IExpense[] = [expense], page = 1, total = 200, limit = 20) => {
    const request = http.expectOne(`${environment.apiUrl}/expenses`);
    request.flush({ items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    await fixture.whenStable();
    fixture.detectChanges();
    TestBed.tick();
    return request;
  };

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ExpenseTableComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(ExpenseTableComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    TestBed.tick();
  });

  afterEach(() => { http.verify({ ignoreCancelled: true }); localStorage.clear(); });

  it('uses QUERY with defaults and takes the paginator total from the API', async () => {
    const request = await respond();
    expect(request.request.method).toBe('QUERY');
    expect(request.request.body).toEqual({});
    expect(component.pageSize()).toBe(20);
    expect(component.length()).toBe(200);
    expect(component.expenses()).toEqual([expense]);
  });

  it('requests page two and displays its items without local slicing', async () => {
    await respond();
    component.onPageChange({ pageIndex: 1, pageSize: 20, length: 200 });
    fixture.detectChanges();
    TestBed.tick();
    const second = { ...expense, id: 'expense-21' };
    const request = await respond([second], 2);
    expect(request.request.body).toEqual({ page: 2 });
    expect(component.expenses()).toEqual([second]);
    expect(component.pageNumber()).toBe(1);
  });

  it('resets to page one when the category filter changes', async () => {
    await respond();
    component.onPageChange({ pageIndex: 2, pageSize: 20, length: 200 });
    fixture.detectChanges();
    TestBed.tick();
    await respond([expense], 3);
    component.tableFormModel.set({ category: 'transport' });
    fixture.detectChanges();
    TestBed.tick();
    const serverExpense = { ...expense, category: 'transport' };
    const request = await respond([serverExpense]);
    expect(request.request.body).toEqual({ category: 'transport' });
    expect(component.pageNumber()).toBe(0);
    expect(component.expenses()).toEqual([serverExpense]);
  });

  it('sends supported sorting to the API and preserves its returned order', async () => {
    await respond();
    component.onPageChange({ pageIndex: 1, pageSize: 20, length: 200 });
    fixture.detectChanges();
    TestBed.tick();
    await respond([expense], 2);
    component.onSortChange({ active: 'amount', direction: 'asc' });
    fixture.detectChanges();
    TestBed.tick();
    const rows = [{ ...expense, id: 'expensive', amount: 100 }, expense];
    const request = await respond(rows);
    expect(request.request.body).toEqual({ sortBy: 'amount', sortOrder: 'asc' });
    expect(component.pageNumber()).toBe(0);
    expect(component.expenses()).toEqual(rows);
  });

  it('returns to the default empty body when category and sort are cleared', async () => {
    await respond();
    component.tableFormModel.set({ category: 'food' });
    component.onSortChange({ active: 'category', direction: 'asc' });
    fixture.detectChanges();
    TestBed.tick();
    await respond();
    component.clearCategoryFilter();
    component.onSortChange({ active: 'expenseDate', direction: 'desc' });
    fixture.detectChanges();
    TestBed.tick();
    expect((await respond()).request.body).toEqual({});
  });

  it('requests a selected page size within the server limit', async () => {
    await respond();
    component.onPageChange({ pageIndex: 0, pageSize: 100, length: 200 });
    fixture.detectChanges();
    TestBed.tick();
    expect((await respond([expense], 1, 200, 100)).request.body).toEqual({ limit: 100 });
  });

  it('shows a filtered empty state and lets the user clear the category', async () => {
    await respond();
    component.tableFormModel.set({ category: 'food' });
    fixture.detectChanges();
    TestBed.tick();
    await respond([], 1, 0);
    expect(component.hasCategoryFilter()).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('No expenses in this category');
  });

  it('renders the server page as mobile cards using the same total', async () => {
    TestBed.inject(ViewportServiceService).isMobile.set(true);
    await respond([expense, { ...expense, id: 'expense-2' }]);
    expect(fixture.nativeElement.querySelectorAll('.expense-card-item').length).toBe(2);
    expect(component.length()).toBe(200);
  });
});
