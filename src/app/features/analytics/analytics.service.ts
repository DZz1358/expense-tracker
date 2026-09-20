import { Injectable, inject } from '@angular/core';

import { LanguageService } from '../../core/i18n/language.service';
import { AppSettingsService, CurrencyCode } from '../../core/services/app-settings.service';
import { ExpenseFilters, ExpenseSummary, ExpenseSummaryItem } from '../../models/expense-query.models';

export type AnalyticsPeriod = 'month' | 'last30' | 'year' | 'all';

export interface AnalyticsCategoryTotal {
  id: string;
  label: string;
  color: string;
  total: number;
  count: number;
  percentage: number;
}

export interface AnalyticsTimelinePoint {
  key: string;
  label: string;
  total: number;
}

export interface AnalyticsViewModel {
  total: number;
  count: number;
  averagePerDay: number;
  biggestExpense: ExpenseSummaryItem | null;
  topCategory: AnalyticsCategoryTotal | null;
  categoryTotals: AnalyticsCategoryTotal[];
  timeline: AnalyticsTimelinePoint[];
  previousTotal: number | null;
  changePercent: number | null;
}

export const EMPTY_EXPENSE_SUMMARY: ExpenseSummary = {
  total: 0, totalAmount: 0, byCategory: [], byDate: [], activeDays: 0, biggestExpense: null,
};

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly appSettingsService = inject(AppSettingsService);
  private readonly languageService = inject(LanguageService);

  buildViewModel(
    summary: ExpenseSummary,
    period: AnalyticsPeriod,
    previousSummary: ExpenseSummary | null = null,
  ): AnalyticsViewModel {
    const total = summary.totalAmount;
    const previousTotal = previousSummary?.totalAmount ?? null;
    const groupedCategories = new Map<string, { total: number; count: number }>();
    for (const value of summary.byCategory) {
      const category = this.appSettingsService.getCategory(value.category);
      const id = category?.id ?? value.category.trim().toLowerCase();
      if (!id) continue;
      const previous = groupedCategories.get(id) ?? { total: 0, count: 0 };
      groupedCategories.set(id, {
        total: previous.total + value.totalAmount,
        count: previous.count + value.total,
      });
    }
    const categoryTotals = Array.from(groupedCategories, ([id, value]) => {
      const category = this.appSettingsService.getCategory(id);
      return {
        id,
        label: category?.custom
          ? category.label
          : category
            ? this.languageService.t(`category.${category.id}`)
            : id,
        color: category?.color ?? '#9E9E9E',
        total: value.total,
        count: value.count,
        percentage: total > 0 ? (value.total / total) * 100 : 0,
      };
    }).sort((a, b) => b.total - a.total || a.id.localeCompare(b.id));

    return {
      total,
      count: summary.total,
      averagePerDay: summary.activeDays > 0 ? total / summary.activeDays : 0,
      biggestExpense: summary.biggestExpense,
      topCategory: categoryTotals[0] ?? null,
      categoryTotals,
      timeline: this.buildTimeline(summary.byDate, period),
      previousTotal,
      changePercent: previousTotal === null || previousTotal === 0
        ? null
        : ((total - previousTotal) / previousTotal) * 100,
    };
  }

  getPeriodFilters(period: AnalyticsPeriod, now = new Date()): {
    current: ExpenseFilters;
    previous: ExpenseFilters | null;
  } {
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const today = new Date(Date.UTC(year, month, now.getUTCDate()));
    const dateTo = this.dateKey(today);

    if (period === 'month') {
      return {
        current: { dateFrom: this.dateKey(new Date(Date.UTC(year, month, 1))), dateTo },
        previous: {
          dateFrom: this.dateKey(new Date(Date.UTC(year, month - 1, 1))),
          dateTo: this.dateKey(new Date(Date.UTC(year, month, 0))),
        },
      };
    }

    if (period === 'last30') {
      return {
        current: { dateFrom: this.dateKey(this.addDays(today, -29)), dateTo },
        previous: {
          dateFrom: this.dateKey(this.addDays(today, -59)),
          dateTo: this.dateKey(this.addDays(today, -30)),
        },
      };
    }

    if (period === 'year') {
      return {
        current: { dateFrom: `${year}-01-01`, dateTo },
        previous: { dateFrom: `${year - 1}-01-01`, dateTo: `${year - 1}-12-31` },
      };
    }

    return { current: {}, previous: null };
  }

  formatCurrency(amount: number, currency: CurrencyCode): string {
    return new Intl.NumberFormat(this.languageService.dateLocale(), {
      style: 'currency', currency,
    }).format(amount);
  }

  private buildTimeline(
    byDate: ExpenseSummary['byDate'] | undefined,
    period: AnalyticsPeriod,
  ): AnalyticsTimelinePoint[] {
    const groupByMonth = period === 'year' || period === 'all';
    const totals = new Map<string, number>();
    // Second line of defence: a caller that bypasses normalizeExpenseSummary must
    // not be able to freeze the page from inside the viewModel computed.
    for (const point of byDate ?? []) {
      // A backend that returns a full ISO timestamp instead of a calendar day
      // still produces a usable chart rather than a RangeError.
      const day = typeof point.date === 'string' ? point.date.slice(0, 10) : '';
      if (!day) continue;
      const key = groupByMonth ? day.slice(0, 7) : day;
      totals.set(key, (totals.get(key) ?? 0) + point.totalAmount);
    }

    return Array.from(totals, ([key, total]) => ({
      key,
      total,
      label: this.timelineLabel(key, groupByMonth),
    }));
  }

  private timelineLabel(key: string, groupByMonth: boolean): string {
    const date = new Date(`${groupByMonth ? `${key}-01` : key}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return key;

    return new Intl.DateTimeFormat(this.languageService.dateLocale(), {
      ...(groupByMonth ? { month: 'short', year: '2-digit' } as const : { month: 'short', day: 'numeric' } as const),
      timeZone: 'UTC',
    }).format(date);
  }

  private dateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  }
}
