import { Injectable, inject } from '@angular/core';

import { LanguageService } from '../../core/i18n/language.service';
import { AppSettingsService, CurrencyCode } from '../../core/services/app-settings.service';
import { IExpense } from '../../models/expense.interface';
import { ExpenseFilters, ExpenseSummary } from '../../models/expense-query.models';

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
  biggestExpense: IExpense | null;
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
    const categoryTotals = summary.byCategory.map((value) => {
      const category = this.appSettingsService.getCategory(value.category);
      return {
        id: value.category,
        label: category?.custom
          ? category.label
          : category
            ? this.languageService.t(`category.${value.category}`)
            : value.category,
        color: category?.color ?? '#9E9E9E',
        total: value.totalAmount,
        count: value.total,
        percentage: total > 0 ? (value.totalAmount / total) * 100 : 0,
      };
    });

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

  private buildTimeline(byDate: ExpenseSummary['byDate'], period: AnalyticsPeriod): AnalyticsTimelinePoint[] {
    const groupByMonth = period === 'year' || period === 'all';
    const totals = new Map<string, number>();
    for (const point of byDate) {
      const key = groupByMonth ? point.date.slice(0, 7) : point.date;
      totals.set(key, (totals.get(key) ?? 0) + point.totalAmount);
    }

    return Array.from(totals, ([key, total]) => ({
      key,
      total,
      label: new Intl.DateTimeFormat(this.languageService.dateLocale(), {
        ...(groupByMonth ? { month: 'short', year: '2-digit' } as const : { month: 'short', day: 'numeric' } as const),
        timeZone: 'UTC',
      }).format(new Date(`${groupByMonth ? `${key}-01` : key}T00:00:00Z`)),
    }));
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
