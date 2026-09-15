import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DateAdapter } from '@angular/material/core';
import { formatDate } from '@angular/common';

import { environment } from '../../../environments/environment';
import { IExpense } from '../../models/expense.interface';
import { ViewportServiceService } from '../../core/services/viewport-service.service';
import { ExpenseTableComponent } from './expense-table.component';

describe('ExpenseTableComponent server pagination', () => {
  let component: ExpenseTableComponent;
  let fixture: ComponentFixture<ExpenseTableComponent>;
  let http: HttpTestingController;
  let defaultDates: { dateFrom: string; dateTo: string };
  let monthStart: Date;
  let monthEnd: Date;
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

  const respondNow = (items: IExpense[] = [expense], page = 1, total = 200) => {
    const request = http.expectOne(`${environment.apiUrl}/expenses`);
    request.flush({ items, pagination: { page, limit: 20, total, totalPages: Math.ceil(total / 20) } });
    fixture.detectChanges();
    TestBed.tick();
    tick();
    fixture.detectChanges();
    TestBed.tick();
    return request;
  };

  const enterFilter = (selector: string, value: string, synchronize = true) => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(selector);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    if (synchronize) {
      fixture.detectChanges();
      TestBed.tick();
    }
  };

  beforeEach(async () => {
    localStorage.clear();
    const today = new Date();
    monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    defaultDates = {
      dateFrom: formatDate(monthStart, 'yyyy-MM-dd', 'en'),
      dateTo: formatDate(monthEnd, 'yyyy-MM-dd', 'en'),
    };
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

  it('selects the entire current month by default and sends its dates in the first QUERY', async () => {
    const request = await respond();
    expect(request.request.method).toBe('QUERY');
    expect(request.request.body).toEqual(defaultDates);
    expect(component.dateRange()).toEqual({ start: monthStart, end: monthEnd });
    const inputs: NodeListOf<HTMLInputElement> = fixture.nativeElement.querySelectorAll('.date-filter input');
    expect(Array.from(inputs).every((input) => input.value.length > 0)).toBeTrue();
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
    expect(request.request.body).toEqual({ ...defaultDates, page: 2 });
    expect(component.expenses()).toEqual([second]);
    expect(component.pageNumber()).toBe(1);
  });

  it('resets to page one when the category filter changes', async () => {
    await respond();
    component.onPageChange({ pageIndex: 2, pageSize: 20, length: 200 });
    fixture.detectChanges();
    TestBed.tick();
    await respond([expense], 3);
    component.tableFormModel.update((value) => ({ ...value, category: 'transport' }));
    fixture.detectChanges();
    TestBed.tick();
    const serverExpense = { ...expense, category: 'transport' };
    const request = await respond([serverExpense]);
    expect(request.request.body).toEqual({ ...defaultDates, category: 'transport' });
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
    expect(request.request.body).toEqual({ ...defaultDates, sortBy: 'amount', sortOrder: 'asc' });
    expect(component.pageNumber()).toBe(0);
    expect(component.expenses()).toEqual(rows);
  });

  it('keeps the current month when category and sort are cleared', async () => {
    await respond();
    component.tableFormModel.update((value) => ({ ...value, category: 'food' }));
    component.onSortChange({ active: 'category', direction: 'asc' });
    fixture.detectChanges();
    TestBed.tick();
    await respond();
    component.clearCategoryFilter();
    component.onSortChange({ active: 'expenseDate', direction: 'desc' });
    fixture.detectChanges();
    TestBed.tick();
    expect((await respond()).request.body).toEqual(defaultDates);
  });

  it('requests a selected page size within the server limit', async () => {
    await respond();
    component.onPageChange({ pageIndex: 0, pageSize: 100, length: 200 });
    fixture.detectChanges();
    TestBed.tick();
    expect((await respond([expense], 1, 200, 100)).request.body).toEqual({ ...defaultDates, limit: 100 });
  });

  it('shows a filtered empty state and lets the user clear the category', async () => {
    await respond();
    component.tableFormModel.set({ category: 'food', dateFrom: '', dateTo: '', q: '' });
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

  it('combines dates with the category, resets the page, and keeps filters on later pages', async () => {
    await respond();
    component.onPageChange({ pageIndex: 2, pageSize: 20, length: 200 });
    fixture.detectChanges();
    TestBed.tick();
    await respond([expense], 3);

    component.tableFormModel.update((value) => ({ ...value, category: 'transport' }));
    component.onDateRangeChange('dateFrom', new Date(2026, 8, 1));
    component.onDateRangeChange('dateTo', new Date(2026, 8, 30));
    fixture.detectChanges();
    TestBed.tick();
    const request = await respond();
    expect(request.request.body).toEqual({ category: 'transport', dateFrom: '2026-09-01', dateTo: '2026-09-30' });
    expect(component.pageNumber()).toBe(0);

    component.onPageChange({ pageIndex: 1, pageSize: 20, length: 200 });
    fixture.detectChanges();
    TestBed.tick();
    expect((await respond([expense], 2)).request.body).toEqual({
      category: 'transport', dateFrom: '2026-09-01', dateTo: '2026-09-30', page: 2,
    });
  });

  for (const dates of [
    { dateFrom: '2026-09-01' },
    { dateTo: '2026-09-30' },
    { dateFrom: '2026-09-15', dateTo: '2026-09-15' },
  ]) {
    it(`supports date filters ${JSON.stringify(dates)} and a filtered empty state`, async () => {
      await respond();
      component.tableFormModel.update((value) => ({ ...value, dateFrom: '', dateTo: '', ...dates }));
      fixture.detectChanges();
      TestBed.tick();
      expect((await respond([], 1, 0)).request.body).toEqual(dates);
      expect(component.hasFilters()).toBeTrue();
      expect(fixture.nativeElement.textContent).toContain('No matching expenses');

      fixture.nativeElement.querySelector('.empty-state button').click();
      fixture.detectChanges();
      TestBed.tick();
      expect((await respond()).request.body).toEqual({});
      expect(component.hasFilters()).toBeFalse();
    });
  }

  it('debounces description input, trims it, and resets pagination only when the search runs', fakeAsync(() => {
    respondNow();
    component.onPageChange({ pageIndex: 1, pageSize: 20, length: 200 });
    fixture.detectChanges();
    TestBed.tick();
    respondNow([expense], 2);

    enterFilter('input[type="search"]', 'Co');
    tick(150);
    http.expectNone(`${environment.apiUrl}/expenses`);
    expect(component.pageNumber()).toBe(1);

    enterFilter('input[type="search"]', '  Coffee [work]  ');
    tick(299);
    http.expectNone(`${environment.apiUrl}/expenses`);
    tick(1);
    fixture.detectChanges();
    TestBed.tick();
    expect(respondNow().request.body).toEqual({ ...defaultDates, q: 'Coffee [work]' });
    expect(component.pageNumber()).toBe(0);
    expect(fixture.nativeElement.querySelector('input[type="search"]').maxLength).toBe(100);

    enterFilter('input[type="search"]', '   ');
    expect(respondNow().request.body).toEqual(defaultDates);
    expect(component.hasFilters()).toBeTrue();
  }));

  it('clears every filter and cancels a pending description search', fakeAsync(() => {
    respondNow();
    component.tableFormModel.set({ category: 'transport', dateFrom: '2026-09-01', dateTo: '2026-09-30', q: 'Train' });
    fixture.detectChanges();
    TestBed.tick();
    expect(respondNow().request.body).toEqual({ category: 'transport', dateFrom: '2026-09-01', dateTo: '2026-09-30' });
    tick(300);
    fixture.detectChanges();
    TestBed.tick();
    expect(respondNow().request.body).toEqual({ category: 'transport', dateFrom: '2026-09-01', dateTo: '2026-09-30', q: 'Train' });

    enterFilter('input[type="search"]', 'Another train');
    fixture.nativeElement.querySelector('.clear-filters').click();
    fixture.detectChanges();
    TestBed.tick();
    expect(respondNow().request.body).toEqual({});
    tick(300);
    fixture.detectChanges();
    TestBed.tick();
    http.expectNone(`${environment.apiUrl}/expenses`);
    expect(component.tableFormModel()).toEqual({ category: '', dateFrom: '', dateTo: '', q: '' });
    const dateInputs: NodeListOf<HTMLInputElement> = fixture.nativeElement.querySelectorAll('.date-filter input');
    expect(Array.from(dateInputs).map((input) => input.value)).toEqual(['', '']);
  }));

  it('blocks a reversed date range and resumes querying after it is corrected', async () => {
    await respond();
    component.tableFormModel.update((value) => ({ ...value, dateFrom: '2026-09-30', dateTo: '2026-09-01' }));
    component.tableForm.dateTo().markAsDirty();
    fixture.detectChanges();
    TestBed.tick();
    http.expectNone(`${environment.apiUrl}/expenses`);
    expect(component.tableForm.dateTo().invalid()).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('The start date must not be after the end date.');

    component.tableFormModel.update((value) => ({ ...value, dateTo: '2026-09-30' }));
    fixture.detectChanges();
    TestBed.tick();
    expect((await respond()).request.body).toEqual({ dateFrom: '2026-09-30', dateTo: '2026-09-30' });
  });

  it('uses the same date and description controls to filter mobile cards', fakeAsync(() => {
    TestBed.inject(ViewportServiceService).isMobile.set(true);
    respondNow();
    expect(fixture.nativeElement.querySelectorAll('.expense-cards-wrapper mat-date-range-input').length).toBe(1);
    enterFilter('.expense-cards-wrapper input[type="search"]', 'Coffee');
    component.onDateRangeChange('dateFrom', null);
    component.onDateRangeChange('dateTo', new Date(2026, 8, 15));
    fixture.detectChanges();
    TestBed.tick();
    expect(respondNow().request.body).toEqual({ dateTo: '2026-09-15' });
    tick(300);
    fixture.detectChanges();
    TestBed.tick();
    expect(respondNow().request.body).toEqual({ dateTo: '2026-09-15', q: 'Coffee' });
    expect(fixture.nativeElement.querySelectorAll('.expense-card-item').length).toBe(1);
    expect(component.length()).toBe(200);
  }));

  for (const mobile of [false, true]) {
    it(`selects a date range from the ${mobile ? 'mobile' : 'desktop'} calendar and clears it`, fakeAsync(() => {
      TestBed.inject(ViewportServiceService).isMobile.set(mobile);
      const adapter = fixture.debugElement.injector.get<DateAdapter<Date>>(DateAdapter);
      spyOn(adapter, 'today').and.returnValue(new Date(2026, 8, 15));
      respondNow();
      component.clearFilters();
      fixture.detectChanges();
      TestBed.tick();
      expect(respondNow().request.body).toEqual({});

      fixture.nativeElement.querySelector('mat-datepicker-toggle button').click();
      fixture.detectChanges();
      TestBed.tick();
      tick(250);
      fixture.detectChanges();
      expect(document.querySelector('.mat-calendar')).not.toBeNull();

      const selectDay = (day: string) => {
        const cells = Array.from(document.querySelectorAll<HTMLButtonElement>('.mat-calendar-body-cell'));
        const cell = cells.find((button) => button.textContent?.trim() === day);
        expect(cell).withContext(`Calendar day ${day}`).toBeDefined();
        cell!.click();
        fixture.detectChanges();
        TestBed.tick();
      };

      selectDay('1');
      expect(respondNow().request.body).toEqual({ dateFrom: '2026-09-01' });
      selectDay('15');
      expect(respondNow().request.body).toEqual({ dateFrom: '2026-09-01', dateTo: '2026-09-15' });
      tick(250);
      fixture.detectChanges();
      expect(document.querySelector('.mat-calendar')).toBeNull();

      fixture.nativeElement.querySelector('.clear-filters').click();
      fixture.detectChanges();
      TestBed.tick();
      expect(respondNow().request.body).toEqual({});
      const inputs: NodeListOf<HTMLInputElement> = fixture.nativeElement.querySelectorAll('.date-filter input');
      expect(Array.from(inputs).map((input) => input.value)).toEqual(['', '']);
    }));
  }

  it('keeps desktop fields equally wide and places mobile clearing beside a narrower date picker', async () => {
    await respond();
    for (const { width, mobile } of [
      { width: 320, mobile: true }, { width: 390, mobile: true },
      { width: 767, mobile: false }, { width: 1280, mobile: false },
    ]) {
      TestBed.inject(ViewportServiceService).isMobile.set(mobile);
      fixture.nativeElement.style.display = 'block';
      fixture.nativeElement.style.width = `${width}px`;
      fixture.detectChanges();
      TestBed.tick();
      const wrapper = fixture.nativeElement.querySelector('.expense-filters').getBoundingClientRect();
      const fields: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.expense-filters mat-form-field');
      const widths = Array.from(fields).map((field) => field.getBoundingClientRect().width);
      if (mobile) {
        expect(Math.abs(widths[0] - widths[1])).withContext(`Fields at ${width}px`).toBeLessThan(1);
        expect(widths[2]).withContext(`Date picker at ${width}px`).toBeLessThan(widths[0]);
        const dateBounds = fixture.nativeElement.querySelector('.date-filter').getBoundingClientRect();
        const clearBounds = fixture.nativeElement.querySelector('.clear-filters').getBoundingClientRect();
        const dateCenter = dateBounds.top + dateBounds.height / 2;
        const clearCenter = clearBounds.top + clearBounds.height / 2;
        expect(Math.abs(dateCenter - clearCenter)).withContext(`Clear button at ${width}px`).toBeLessThan(1);
        expect(clearBounds.left).toBeGreaterThan(dateBounds.right);
        expect(clearBounds.right).toBeLessThanOrEqual(wrapper.right);
      } else {
        expect(Math.max(...widths) - Math.min(...widths)).withContext(`Fields at ${width}px`).toBeLessThan(1);
      }
      const inputs: NodeListOf<HTMLInputElement> = fixture.nativeElement.querySelectorAll('.expense-filters input');
      for (const input of inputs) {
        const bounds = input.getBoundingClientRect();
        expect(bounds.right).withContext(`Input ${input.type} at ${width}px`).toBeLessThanOrEqual(wrapper.right);
        expect(bounds.left).withContext(`Input ${input.type} at ${width}px`).toBeGreaterThanOrEqual(wrapper.left);
      }
    }
  });
});
