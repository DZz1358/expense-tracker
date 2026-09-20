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

  it('merges legacy category casing even when a caller bypasses response normalization', () => {
    const model = service.buildViewModel({
      ...EMPTY_EXPENSE_SUMMARY,
      total: 3,
      totalAmount: 35,
      byCategory: [
        { category: 'Other', total: 1, totalAmount: 10 },
        { category: 'other', total: 2, totalAmount: 25 },
      ],
    }, 'month');

    expect(model.categoryTotals).toEqual([jasmine.objectContaining({
      id: 'other', label: 'Other', total: 35, count: 3, percentage: 100,
    })]);
    expect(model.topCategory?.id).toBe('other');
  });

  // Every `now` below is an absolute instant (an ISO string carrying an explicit
  // offset), never a local-calendar `new Date(y, m, d)` literal, so these specs
  // assert the same boundaries on every machine regardless of its timezone.
  // The boundaries themselves are the UTC calendar: `getPeriodFilters` reads
  // `getUTCFullYear` / `getUTCMonth` / `getUTCDate`.

  it('derives month boundaries from the UTC calendar, not the local one', () => {
    // 2026-09-01T00:30+02:00 is still 2026-08-31 in UTC, so the window is August.
    const now = new Date('2026-09-01T00:30:00+02:00');
    expect(service.getPeriodFilters('month', now)).toEqual({
      current: { dateFrom: '2026-08-01', dateTo: '2026-08-31' },
      previous: { dateFrom: '2026-07-01', dateTo: '2026-07-31' },
    });
  });

  it('ends the current month at today, and the previous month at its last day', () => {
    const now = new Date('2026-09-19T08:00:00Z');
    expect(service.getPeriodFilters('month', now)).toEqual({
      current: { dateFrom: '2026-09-01', dateTo: '2026-09-19' },
      previous: { dateFrom: '2026-08-01', dateTo: '2026-08-31' },
    });
  });

  it('rolls the previous month back across a year boundary', () => {
    const now = new Date('2026-01-15T23:45:00Z');
    expect(service.getPeriodFilters('month', now)).toEqual({
      current: { dateFrom: '2026-01-01', dateTo: '2026-01-15' },
      previous: { dateFrom: '2025-12-01', dateTo: '2025-12-31' },
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

  it('only ever puts 10-character date-only strings on the wire', () => {
    const now = new Date('2026-03-07T21:15:00Z');
    for (const period of ['month', 'last30', 'year', 'all'] as const) {
      const { current, previous } = service.getPeriodFilters(period, now);
      for (const filters of [current, previous]) {
        for (const value of [filters?.dateFrom, filters?.dateTo]) {
          if (value !== undefined) expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
      }
    }
  });

  it('survives a summary whose byDate an older backend did not send', () => {
    const legacy = {
      total: 4, totalAmount: 120, activeDays: 0, biggestExpense: null, byCategory: [],
    } as unknown as ExpenseSummary;

    const model = service.buildViewModel(legacy, 'month');
    expect(model.timeline).toEqual([]);
    expect(model.total).toBe(120);
    expect(model.averagePerDay).toBe(0);
  });

  it('collapses a full ISO timestamp bucket to its calendar day', () => {
    const model = service.buildViewModel({
      ...EMPTY_EXPENSE_SUMMARY,
      byDate: [{ date: '2026-09-02T12:00:00.000Z', total: 1, totalAmount: 20 }],
    }, 'month');

    expect(model.timeline.map(point => point.key)).toEqual(['2026-09-02']);
    expect(model.timeline[0].total).toBe(20);
  });

  it('falls back to the raw key instead of throwing when a bucket is not a date', () => {
    const model = service.buildViewModel({
      ...EMPTY_EXPENSE_SUMMARY,
      byDate: [{ date: 'not-a-date', total: 1, totalAmount: 5 }],
    }, 'month');

    expect(model.timeline).toEqual([{ key: 'not-a-date', label: 'not-a-date', total: 5 }]);
  });
});
