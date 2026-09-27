import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { AnalyticsComponent } from './analytics.component';
import { EMPTY_EXPENSE_SUMMARY } from './analytics.service';

describe('AnalyticsComponent summary queries', () => {
  let component: AnalyticsComponent;
  let fixture: ComponentFixture<AnalyticsComponent>;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/operations/summary`;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AnalyticsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(AnalyticsComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    TestBed.tick();
  });

  afterEach(() => { http.verify({ ignoreCancelled: true }); localStorage.clear(); });

  it('queries the current and previous period summaries, never the expense list', async () => {
    const requests = http.match(url);
    const filters = component.periodFilters();
    expect(component.period()).toBe('month');
    expect(requests.length).toBe(2);
    expect(requests.find(request => request.request.body.dateFrom === filters.current.dateFrom)?.request.body)
      .toEqual({ ...filters.current, type: 'expense' });
    expect(requests.find(request => request.request.body.dateFrom === filters.previous?.dateFrom)?.request.body)
      .toEqual({ ...filters.previous!, type: 'expense' });
    for (const request of requests) {
      expect(request.request.method).toBe('QUERY');
      expect(request.request.body.type).toBe('expense');
      expect(request.request.headers.get('Content-Type')).toBe('application/json');
      expect(request.request.body.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(request.request.body.dateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(request.request.body.page).toBeUndefined();
      expect(request.request.body.limit).toBeUndefined();
      request.flush(EMPTY_EXPENSE_SUMMARY);
    }
    http.expectNone(`${environment.apiUrl}/operations`);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.hasExpenses()).toBeFalse();
  });

  it('changes period through the API and pins the expense type even for all-time totals', async () => {
    http.match(url).forEach(request => request.flush(EMPTY_EXPENSE_SUMMARY));
    component.setPeriod('all');
    fixture.detectChanges();
    TestBed.tick();
    const request = http.expectOne(url);
    expect(request.request.body).toEqual({ type: 'expense' });
    request.flush({ ...EMPTY_EXPENSE_SUMMARY, total: 120, totalAmount: 300, activeDays: 3 });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.viewModel().count).toBe(120);
    expect(component.viewModel().total).toBe(300);
    expect(component.viewModel().averagePerDay).toBe(100);
    expect(component.hasExpenses()).toBeTrue();
    expect(component.viewModel().changePercent).toBeNull();
  });

  it('keeps current totals available if the previous-period summary fails', async () => {
    const requests = http.match(url);
    const current = requests.find(request => request.request.body.dateFrom === component.periodFilters().current.dateFrom)!;
    const previous = requests.find(request => request !== current)!;
    current.flush({ ...EMPTY_EXPENSE_SUMMARY, total: 1, totalAmount: 10, activeDays: 1 });
    previous.flush({}, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.viewModel().total).toBe(10);
    expect(component.viewModel().changePercent).toBeNull();
  });

  // The regression suite for the original bug: a 200 whose body predates the
  // byDate / activeDays / biggestExpense contract used to throw inside the
  // `viewModel` computed, leaving the page stuck on the loading card forever.
  // Every spec below therefore asserts a real rendered state, not just numbers.

  it('renders a settled state when the body is an empty object', async () => {
    http.match(url).forEach(request => request.flush({}));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.dataResource.isLoading()).toBeFalse();
    expect(component.dataResource.error()).toBeUndefined();
    expect(component.hasExpenses()).toBeFalse();
    expect(component.viewModel().total).toBe(0);
    expect(component.viewModel().timeline).toEqual([]);
    expect(component.viewModel().biggestExpense).toBeNull();
    // The empty state renders, and it is not the error or loading card.
    expect(fixture.nativeElement.querySelector('.analytics-state')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.analytics-state--error')).toBeNull();
    expect(fixture.nativeElement.querySelector('.analytics-state').textContent)
      .toContain('No analytics yet');
  });

  it('renders the charts when the body carries totals but no byDate', async () => {
    http.match(url).forEach(request => request.flush({
      total: 3,
      totalAmount: 300,
      byCategory: [],
    }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.dataResource.isLoading()).toBeFalse();
    expect(component.hasExpenses()).toBeTrue();
    expect(component.viewModel().total).toBe(300);
    expect(component.viewModel().timeline).toEqual([]);
    expect(component.viewModel().averagePerDay).toBe(0);
    expect(component.viewModel().topCategory).toBeNull();
    expect(component.viewModel().biggestExpense).toBeNull();
    expect(fixture.nativeElement.querySelector('.analytics-state')).toBeNull();
  });

  it('renders against a backend that omits byDate, activeDays and biggestExpense', async () => {
    http.match(url).forEach(request => request.flush({
      total: 4,
      totalAmount: 120,
      byCategory: [{ category: 'food', total: 4, totalAmount: 120 }],
    }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.hasExpenses()).toBeTrue();
    expect(component.viewModel().total).toBe(120);
    expect(component.viewModel().timeline).toEqual([]);
    expect(component.viewModel().averagePerDay).toBe(0);
    expect(component.viewModel().biggestExpense).toBeNull();
    expect(component.viewModel().topCategory?.id).toBe('food');
    expect(fixture.nativeElement.querySelector('.analytics-state')).toBeNull();
  });

  it('builds an ascending timeline from the byDate buckets returned by the API', async () => {
    http.match(url).forEach(request => request.flush({
      total: 3,
      totalAmount: 60,
      byCategory: [{ category: 'food', total: 3, totalAmount: 60 }],
      byDate: [
        { date: '2026-09-02', total: 1, totalAmount: 20 },
        { date: '2026-09-01', total: 2, totalAmount: 40 },
      ],
      activeDays: 2,
      biggestExpense: {
        id: '000000000000000000000004',
        amount: 30,
        category: 'food',
        expenseDate: '2026-09-01T00:00:00.000Z',
        description: 'Lunch',
        attachmentUrl: null,
        createdAt: null,
      },
    }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.viewModel().timeline.map(point => point.key))
      .toEqual(['2026-09-01', '2026-09-02']);
    expect(component.viewModel().averagePerDay).toBe(30);
    expect(component.viewModel().biggestExpense?.amount).toBe(30);
    expect(component.viewModel().biggestExpense?.description).toBe('Lunch');
    expect(fixture.nativeElement.querySelector('.analytics-state')).toBeNull();
  });

  it('does not throw on a body whose fields have the wrong types', async () => {
    http.match(url).forEach(request => request.flush({
      total: '5',
      totalAmount: null,
      byCategory: 'nope',
      byDate: { date: '2026-09-01' },
      activeDays: 'many',
      biggestExpense: 'nope',
    }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.dataResource.error()).toBeUndefined();
    expect(component.hasExpenses()).toBeFalse();
    expect(component.viewModel().total).toBe(0);
    expect(component.viewModel().categoryTotals).toEqual([]);
    expect(component.viewModel().timeline).toEqual([]);
    expect(fixture.nativeElement.querySelector('.analytics-state')).not.toBeNull();
  });
});
