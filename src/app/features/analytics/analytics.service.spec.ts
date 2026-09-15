import { TestBed } from '@angular/core/testing';

import { ExpenseSummary } from '../../models/expense-query.models';
import { AnalyticsService, EMPTY_EXPENSE_SUMMARY } from './analytics.service';

describe('AnalyticsService API summaries', () => {
  let service: AnalyticsService;
  beforeEach(() => { localStorage.clear(); service = TestBed.inject(AnalyticsService); });
  afterEach(() => localStorage.clear());

  const summary: ExpenseSummary = {
    total: 120, totalAmount: 300, activeDays: 3, biggestExpense: null,
    byCategory: [
      { category: 'food', total: 90, totalAmount: 200 },
      { category: 'transport', total: 30, totalAmount: 100 },
    ],
    byDate: [
      { date: '2026-09-01', total: 40, totalAmount: 50 },
      { date: '2026-09-30', total: 40, totalAmount: 150 },
      { date: '2026-10-01', total: 40, totalAmount: 100 },
    ],
  };

  it('uses complete-selection totals and active days supplied by the API', () => {
    const model = service.buildViewModel(summary, 'month', { ...EMPTY_EXPENSE_SUMMARY, totalAmount: 200 });
    expect(model.count).toBe(120);
    expect(model.total).toBe(300);
    expect(model.averagePerDay).toBe(100);
    expect(model.changePercent).toBe(50);
    expect(model.topCategory?.id).toBe('food');
    expect(model.categoryTotals[0].percentage).toBeCloseTo(200 / 300 * 100);
    expect(model.timeline.map(point => point.key)).toEqual(['2026-09-01', '2026-09-30', '2026-10-01']);
  });

  it('groups API daily buckets into monthly timeline points for all-time analytics', () => {
    expect(service.buildViewModel(summary, 'all').timeline.map(({ key, total }) => ({ key, total }))).toEqual([
      { key: '2026-09', total: 200 }, { key: '2026-10', total: 100 },
    ]);
  });

  it('handles an empty selection and a zero previous total', () => {
    const model = service.buildViewModel(EMPTY_EXPENSE_SUMMARY, 'year', EMPTY_EXPENSE_SUMMARY);
    expect(model.averagePerDay).toBe(0);
    expect(model.topCategory).toBeNull();
    expect(model.biggestExpense).toBeNull();
    expect(model.timeline).toEqual([]);
    expect(model.changePercent).toBeNull();
  });

  it('sends UTC calendar boundaries without converting date-only values to local time', () => {
    const now = new Date('2026-09-01T00:30:00+02:00');
    expect(service.getPeriodFilters('month', now)).toEqual({
      current: { dateFrom: '2026-08-01', dateTo: '2026-08-31' },
      previous: { dateFrom: '2026-07-01', dateTo: '2026-07-31' },
    });
  });

  it('uses adjacent 30-day windows and handles a new year', () => {
    const now = new Date('2026-01-01T12:00:00Z');
    expect(service.getPeriodFilters('last30', now)).toEqual({
      current: { dateFrom: '2025-12-03', dateTo: '2026-01-01' },
      previous: { dateFrom: '2025-11-03', dateTo: '2025-12-02' },
    });
    expect(service.getPeriodFilters('year', now)).toEqual({
      current: { dateFrom: '2026-01-01', dateTo: '2026-01-01' },
      previous: { dateFrom: '2025-01-01', dateTo: '2025-12-31' },
    });
  });

  it('uses an empty filter body and no previous period for all time', () => {
    expect(service.getPeriodFilters('all')).toEqual({ current: {}, previous: null });
  });
});
