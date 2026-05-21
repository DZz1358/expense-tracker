import { Injectable, inject } from '@angular/core';

import { LanguageService } from '../../core/i18n/language.service';
import { AppSettingsService, CurrencyCode } from '../../core/services/app-settings.service';
import { IExpense } from '../../models/expense.interface';

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
  expenses: IExpense[];
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

interface PeriodWindow {
  start: Date | null;
  end: Date;
  previousStart: Date | null;
  previousEnd: Date | null;
}

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private readonly appSettingsService = inject(AppSettingsService);
  private readonly languageService = inject(LanguageService);

  buildViewModel(expenses: IExpense[], period: AnalyticsPeriod): AnalyticsViewModel {
    const window = this.getPeriodWindow(period);
    const currentExpenses = this.filterExpenses(expenses, window.start, window.end);
    const previousExpenses = window.previousStart && window.previousEnd
      ? this.filterExpenses(expenses, window.previousStart, window.previousEnd)
      : null;

    const total = this.sum(currentExpenses);
    const previousTotal = previousExpenses ? this.sum(previousExpenses) : null;
    const count = currentExpenses.length;
    const activeDays = this.countActiveDays(currentExpenses);
    const categoryTotals = this.buildCategoryTotals(currentExpenses, total);

    return {
      expenses: currentExpenses,
      total,
      count,
      averagePerDay: activeDays > 0 ? total / activeDays : 0,
      biggestExpense: this.findBiggestExpense(currentExpenses),
      topCategory: categoryTotals[0] ?? null,
      categoryTotals,
      timeline: this.buildTimeline(currentExpenses, period),
      previousTotal,
      changePercent: this.getChangePercent(total, previousTotal),
    };
  }

  formatCurrency(amount: number, currency: CurrencyCode): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  private buildCategoryTotals(expenses: IExpense[], total: number): AnalyticsCategoryTotal[] {
    const categoryMap = new Map<string, { total: number; count: number }>();

    for (const expense of expenses) {
      const current = categoryMap.get(expense.category) ?? { total: 0, count: 0 };
      categoryMap.set(expense.category, {
        total: current.total + Number(expense.amount),
        count: current.count + 1,
      });
    }

    return Array.from(categoryMap.entries())
      .map(([id, value]) => {
        const category = this.appSettingsService.getCategory(id);
        return {
          id,
          label: category?.custom
            ? category.label
            : category
              ? this.languageService.t(`category.${id}`)
              : this.languageService.t('category.Other'),
          color: category?.color ?? '#9E9E9E',
          total: value.total,
          count: value.count,
          percentage: total > 0 ? (value.total / total) * 100 : 0,
        };
      })
      .sort((a, b) => b.total - a.total);
  }

  private buildTimeline(expenses: IExpense[], period: AnalyticsPeriod): AnalyticsTimelinePoint[] {
    const groupByMonth = period === 'year' || period === 'all';
    const timelineMap = new Map<string, number>();

    for (const expense of expenses) {
      const date = this.parseDate(expense.expenseDate);
      if (!date) continue;

      const key = groupByMonth
        ? `${date.getFullYear()}-${this.pad(date.getMonth() + 1)}`
        : `${date.getFullYear()}-${this.pad(date.getMonth() + 1)}-${this.pad(date.getDate())}`;

      timelineMap.set(key, (timelineMap.get(key) ?? 0) + Number(expense.amount));
    }

    return Array.from(timelineMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, total]) => ({
        key,
        label: this.formatTimelineLabel(key, groupByMonth),
        total,
      }));
  }

  private getPeriodWindow(period: AnalyticsPeriod): PeriodWindow {
    const now = this.endOfDay(new Date());

    if (period === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousEnd = this.endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
      return { start, end: now, previousStart, previousEnd };
    }

    if (period === 'last30') {
      const start = this.startOfDay(this.addDays(now, -29));
      const previousEnd = this.endOfDay(this.addDays(start, -1));
      const previousStart = this.startOfDay(this.addDays(previousEnd, -29));
      return { start, end: now, previousStart, previousEnd };
    }

    if (period === 'year') {
      const start = new Date(now.getFullYear(), 0, 1);
      const previousStart = new Date(now.getFullYear() - 1, 0, 1);
      const previousEnd = this.endOfDay(new Date(now.getFullYear() - 1, 11, 31));
      return { start, end: now, previousStart, previousEnd };
    }

    return { start: null, end: now, previousStart: null, previousEnd: null };
  }

  private filterExpenses(expenses: IExpense[], start: Date | null, end: Date): IExpense[] {
    return expenses.filter((expense) => {
      const date = this.parseDate(expense.expenseDate);
      if (!date) return false;
      return (!start || date >= start) && date <= end;
    });
  }

  private findBiggestExpense(expenses: IExpense[]): IExpense | null {
    return expenses.reduce<IExpense | null>((biggest, expense) => {
      if (!biggest || Number(expense.amount) > Number(biggest.amount)) {
        return expense;
      }
      return biggest;
    }, null);
  }

  private countActiveDays(expenses: IExpense[]): number {
    return new Set(
      expenses
        .map((expense) => this.parseDate(expense.expenseDate))
        .filter((date): date is Date => date !== null)
        .map((date) => `${date.getFullYear()}-${this.pad(date.getMonth() + 1)}-${this.pad(date.getDate())}`),
    ).size;
  }

  private getChangePercent(total: number, previousTotal: number | null): number | null {
    if (previousTotal === null || previousTotal === 0) return null;
    return ((total - previousTotal) / previousTotal) * 100;
  }

  private sum(expenses: IExpense[]): number {
    return expenses.reduce((total, expense) => total + Number(expense.amount), 0);
  }

  private parseDate(value: string): Date | null {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private formatTimelineLabel(key: string, groupByMonth: boolean): string {
    const [year, month, day] = key.split('-').map(Number);
    const date = groupByMonth
      ? new Date(year, month - 1, 1)
      : new Date(year, month - 1, day);

    return new Intl.DateTimeFormat(
      this.languageService.activeLanguage() === 'ru' ? 'ru-RU' : 'en-US',
      groupByMonth ? { month: 'short', year: '2-digit' } : { month: 'short', day: 'numeric' },
    ).format(date);
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private startOfDay(date: Date): Date {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  private endOfDay(date: Date): Date {
    const next = new Date(date);
    next.setHours(23, 59, 59, 999);
    return next;
  }

  private pad(value: number): string {
    return String(value).padStart(2, '0');
  }
}
