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
  const url = `${environment.apiUrl}/expenses/summary`;

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
    expect(requests.length).toBe(2);
    for (const request of requests) {
      expect(request.request.method).toBe('QUERY');
      expect(request.request.headers.get('Content-Type')).toBe('application/json');
      expect(request.request.body.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(request.request.body.dateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(request.request.body.page).toBeUndefined();
      expect(request.request.body.limit).toBeUndefined();
      request.flush(EMPTY_EXPENSE_SUMMARY);
    }
    http.expectNone(`${environment.apiUrl}/expenses`);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.hasExpenses()).toBeFalse();
  });

  it('changes period through the API and sends an empty body for all-time totals', async () => {
    http.match(url).forEach(request => request.flush(EMPTY_EXPENSE_SUMMARY));
    component.setPeriod('all');
    fixture.detectChanges();
    TestBed.tick();
    const request = http.expectOne(url);
    expect(request.request.body).toEqual({});
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
});
