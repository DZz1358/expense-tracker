import { httpResource } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { EChartsCoreOption } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';

import { environment } from '../../../environments/environment';
import { LanguageService } from '../../core/i18n/language.service';
import { AppSettingsService } from '../../core/services/app-settings.service';
import { IExpense } from '../../models/expense.interface';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ThemeService } from '../../shared/theme/theme.service';

import { AnalyticsPeriod, AnalyticsService } from './analytics.service';

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
]);

@Component({
  selector: 'app-analytics',
  imports: [
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    NgxEchartsDirective,
    DecimalPipe,
    TranslatePipe,
  ],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsComponent {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly appSettingsService = inject(AppSettingsService);
  private readonly languageService = inject(LanguageService);
  private readonly themeService = inject(ThemeService);

  readonly period = signal<AnalyticsPeriod>('month');
  readonly settings = this.appSettingsService.settings;
  readonly activeTheme = this.themeService.activeTheme;

  readonly periodOptions: Array<{ value: AnalyticsPeriod; labelKey: string }> = [
    { value: 'month', labelKey: 'analytics.periodMonth' },
    { value: 'last30', labelKey: 'analytics.periodLast30' },
    { value: 'year', labelKey: 'analytics.periodYear' },
    { value: 'all', labelKey: 'analytics.periodAll' },
  ];

  readonly chartInitOptions = {
    renderer: 'canvas',
  };

  readonly dataResource = httpResource<IExpense[]>(() => `${environment.apiUrl}/expenses`);

  readonly expenses = computed(() => this.dataResource.value() ?? []);
  readonly viewModel = computed(() => this.analyticsService.buildViewModel(
    this.expenses(),
    this.period(),
  ));
  readonly hasExpenses = computed(() => this.viewModel().expenses.length > 0);

  readonly totalAmount = computed(() => this.formatAmount(this.viewModel().total));
  readonly averagePerDay = computed(() => this.formatAmount(this.viewModel().averagePerDay));
  readonly biggestExpenseAmount = computed(() => this.formatAmount(this.viewModel().biggestExpense?.amount ?? 0));
  readonly topCategoryAmount = computed(() => this.formatAmount(this.viewModel().topCategory?.total ?? 0));
  readonly previousChange = computed(() => {
    const change = this.viewModel().changePercent;
    if (change === null) return this.languageService.t('analytics.noComparison');
    const direction = change >= 0
      ? this.languageService.t('analytics.moreThanPrevious')
      : this.languageService.t('analytics.lessThanPrevious');

    return `${Math.abs(change).toFixed(1)}% ${direction}`;
  });

  readonly categoryChartOptions = computed<EChartsCoreOption>(() => {
    const model = this.viewModel();
    this.activeTheme();

    return {
      color: model.categoryTotals.map((category) => category.color),
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const value = this.formatAmount(Number(params.value));
          return `${params.name}<br/>${value} (${params.percent}%)`;
        },
      },
      legend: {
        bottom: 0,
        icon: 'circle',
        textStyle: {
          color: this.textColor(),
        },
      },
      series: [
        {
          name: this.languageService.t('analytics.categoryBreakdown'),
          type: 'pie',
          radius: ['48%', '72%'],
          center: ['50%', '42%'],
          avoidLabelOverlap: true,
          label: {
            formatter: '{b}',
            color: this.textColor(),
          },
          data: model.categoryTotals.map((category) => ({
            name: category.label,
            value: Number(category.total.toFixed(2)),
          })),
        },
      ],
    };
  });

  readonly timelineChartOptions = computed<EChartsCoreOption>(() => {
    const model = this.viewModel();
    this.activeTheme();

    return {
      color: ['#1E88E5', '#43A047'],
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const point = Array.isArray(params) ? params[0] : params;
          return `${point.axisValue}<br/>${this.formatAmount(Number(point.value))}`;
        },
      },
      grid: {
        top: 20,
        right: 16,
        bottom: 34,
        left: 56,
      },
      xAxis: {
        type: 'category',
        data: model.timeline.map((point) => point.label),
        axisLine: {
          lineStyle: {
            color: this.axisColor(),
          },
        },
        axisLabel: {
          color: this.textColor(),
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: this.textColor(),
          formatter: (value: number) => this.compactAmount(value),
        },
        splitLine: {
          lineStyle: {
            color: this.gridColor(),
          },
        },
      },
      series: [
        {
          name: this.languageService.t('analytics.spendingTimeline'),
          type: 'bar',
          barMaxWidth: 28,
          data: model.timeline.map((point) => Number(point.total.toFixed(2))),
        },
        {
          name: this.languageService.t('analytics.trend'),
          type: 'line',
          smooth: true,
          symbolSize: 7,
          data: model.timeline.map((point) => Number(point.total.toFixed(2))),
        },
      ],
    };
  });

  setPeriod(period: AnalyticsPeriod): void {
    this.period.set(period);
  }

  reload(): void {
    this.dataResource.reload();
  }

  formatAmount(amount: number): string {
    return this.analyticsService.formatCurrency(amount, this.settings().currency);
  }

  private compactAmount(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  }

  private textColor(): string {
    return getComputedStyle(document.body).getPropertyValue('--mat-sys-on-surface').trim() || '#202124';
  }

  private axisColor(): string {
    return getComputedStyle(document.body).getPropertyValue('--mat-sys-outline').trim() || '#9aa0a6';
  }

  private gridColor(): string {
    return getComputedStyle(document.body).getPropertyValue('--mat-sys-outline-variant').trim() || '#e0e0e0';
  }
}
