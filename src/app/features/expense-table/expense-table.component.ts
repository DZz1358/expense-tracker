import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIcon } from '@angular/material/icon';
import { formatDate, NgTemplateOutlet } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { form, FormField, maxLength, validate } from '@angular/forms/signals';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { httpResource } from '@angular/common/http';

import { IExpense } from '../../models/expense.interface';
import { ExpensePage, ExpenseQuery, ExpenseSortBy, ExpenseSortOrder, expenseQueryBody } from '../../models/expense-query.models';
import { ViewportServiceService } from '../../core/services/viewport-service.service';
import { environment } from '../../../environments/environment';
import { ButtonComponent } from '../../shared/button/button.component';
import { ConfirmationModalComponent } from '../../shared/confirmation-modal/confirmation-modal.component';
import { ExpenseModalComponent } from '../../shared/expense-modal/expense-modal.component';
import { CategoryColorPipe } from '../../shared/pipes/category-color.pipe';
import { CategoryIconPipe } from '../../shared/pipes/category-icon.pipe';
import { CategoryLabelPipe } from '../../shared/pipes/category-label.pipe';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { AppSettingsService } from '../../core/services/app-settings.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

import { ExpenseTableService } from './expense-table.service';

@Component({
  selector: 'app-expense-table',
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSidenavModule, MatButtonModule, MatTableModule, MatPaginatorModule, MatSortModule, MatIcon, MatCardModule, ButtonComponent, CategoryIconPipe, CategoryLabelPipe, CategoryColorPipe, MatSelectModule, MatDatepickerModule, FormField, SkeletonComponent, TranslatePipe, NgTemplateOutlet],
  providers: [provideNativeDateAdapter()],
  templateUrl: './expense-table.component.html',
  styleUrl: './expense-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpenseTableComponent {
  dialog = inject(MatDialog);
  destroyRef = inject(DestroyRef);
  expenseTableService = inject(ExpenseTableService);
  viewportServiceService = inject(ViewportServiceService);
  appSettingsService = inject(AppSettingsService);
  languageService = inject(LanguageService);
  private readonly dateAdapter = inject<DateAdapter<Date>>(DateAdapter);
  displayedColumns: string[] = ['description', 'category', 'expenseDate', 'amount', 'settings'];
  readonly settings = this.appSettingsService.settings;

  readonly tableFormModel = signal(this.defaultFilters());
  readonly tableForm = form(this.tableFormModel, (filters) => {
    maxLength(filters.q, 100);
    validate(filters.dateTo, ({ value, valueOf }) => {
      const dateFrom = valueOf(filters.dateFrom);
      return dateFrom && value() && dateFrom > value()
        ? { kind: 'dateRange', message: this.languageService.t('expenses.invalidDateRange') }
        : null;
    });
  });
  readonly dateRangeErrorMatcher = { isErrorState: () => this.tableForm.dateTo().invalid() };
  readonly dateRange = computed(() => {
    const dateFrom = this.tableForm.dateFrom().value();
    const dateTo = this.tableForm.dateTo().value();
    return {
      start: dateFrom ? new Date(`${dateFrom}T00:00:00`) : null,
      end: dateTo ? new Date(`${dateTo}T00:00:00`) : null,
    };
  });
  private readonly searchText = computed(() => this.tableFormModel().q.trim());
  private readonly debouncedSearch = signal('');
  readonly sortState = signal<{ sortBy: ExpenseSortBy; sortOrder: ExpenseSortOrder }>({
    sortBy: 'expenseDate', sortOrder: 'desc',
  });
  readonly filters = computed<ExpenseQuery>(() => {
    const category = this.tableForm.category().value();
    const dateFrom = this.tableForm.dateFrom().value();
    const dateTo = this.tableForm.dateTo().value();
    const { sortBy, sortOrder } = this.sortState();
    return expenseQueryBody({
      category,
      dateFrom,
      dateTo,
      q: this.debouncedSearch(),
      sortBy: sortBy === 'expenseDate' ? undefined : sortBy,
      sortOrder: sortOrder === 'desc' ? undefined : sortOrder,
    });
  });
  readonly pageSize = signal(20);
  readonly pageNumber = linkedSignal({ source: this.filters, computation: () => 0 });
  readonly pageSizeOptions = [5, 10, 20, 25, 50, 100];
  readonly query = computed<ExpenseQuery>(() => expenseQueryBody({
    ...this.filters(),
    page: this.pageNumber() === 0 ? undefined : this.pageNumber() + 1,
    limit: this.pageSize() === 20 ? undefined : this.pageSize(),
  }));
  readonly dataResource = httpResource<ExpensePage>(() => this.tableForm().invalid() ? undefined : ({
    url: `${environment.apiUrl}/expenses`,
    method: 'QUERY',
    body: this.query(),
    headers: { 'Content-Type': 'application/json' },
  }));
  readonly expenses = computed(() => this.dataResource.value()?.items ?? []);
  readonly length = computed(() => this.dataResource.value()?.pagination.total ?? 0);
  readonly hasExpenses = computed(() => this.expenses().length > 0);
  readonly hasCategoryFilter = computed(() => !!this.tableFormModel().category);
  readonly hasSearchOrDateFilter = computed(() => {
    const { dateFrom, dateTo } = this.tableFormModel();
    return !!(dateFrom || dateTo || this.searchText());
  });
  readonly hasFilters = computed(() => this.hasCategoryFilter() || this.hasSearchOrDateFilter());
  selectedCategoryLabel = computed(() => {
    const selectedCategory = this.tableFormModel().category;
    const category = this.appSettingsService.getCategory(selectedCategory);

    if (!category) {
      return this.languageService.t('category.all');
    }

    return category.custom ? category.label : this.languageService.t(`category.${category.id}`);
  });

  private readonly dialogConfig = {
    disableClose: true,
    width: 'calc(100% - 30px)',
    maxWidth: '600px',
  };

  categories = computed(() => {
    return [
      { id: '', label: this.languageService.t('category.all'), color: '', icon: '' },
      ...this.appSettingsService.categories(),
    ]
  })

  constructor() {
    effect(() => this.dateAdapter.setLocale(this.languageService.dateLocale()));

    effect((onCleanup) => {
      const q = this.searchText();
      if (!q) {
        this.debouncedSearch.set('');
        return;
      }
      const timeout = setTimeout(() => this.debouncedSearch.set(q), 300);
      onCleanup(() => clearTimeout(timeout));
    });

    effect(() => {
      if (!this.dataResource.hasValue()) return;
      const lastPage = Math.max(0, this.dataResource.value().pagination.totalPages - 1);
      if (this.pageNumber() > lastPage) this.pageNumber.set(lastPage);
    });
  }

  onPageChange(event: PageEvent) {
    this.pageSize.set(event.pageSize);
    this.pageNumber.set(event.pageIndex);
  }

  onSortChange(sort: Sort): void {
    if (!['expenseDate', 'amount', 'category', 'createdAt'].includes(sort.active)) return;
    this.sortState.set({
      sortBy: sort.active as ExpenseSortBy,
      sortOrder: sort.direction === 'asc' ? 'asc' : 'desc',
    });
  }

  clearCategoryFilter(): void {
    this.tableFormModel.update((value) => ({
      ...value,
      category: '',
    }));
  }

  clearFilters(): void {
    this.tableFormModel.set({ category: '', dateFrom: '', dateTo: '', q: '' });
    this.debouncedSearch.set('');
  }

  onDateRangeChange(field: 'dateFrom' | 'dateTo', date: Date | null): void {
    const value = date ? formatDate(date, 'yyyy-MM-dd', 'en') : '';
    this.tableFormModel.update((filters) => ({ ...filters, [field]: value }));
    this.tableForm[field]().markAsDirty();
  }

  private defaultFilters() {
    const today = this.dateAdapter.today();
    const year = today.getFullYear();
    const month = today.getMonth();
    return {
      category: '',
      dateFrom: formatDate(new Date(year, month, 1), 'yyyy-MM-dd', 'en'),
      dateTo: formatDate(new Date(year, month + 1, 0), 'yyyy-MM-dd', 'en'),
      q: '',
    };
  }

  public openAddExpenseModal(): void {
    this.dialog.open(ExpenseModalComponent, {
      ...this.dialogConfig,
      data: {
        expense: null,
        title: 'Add new expense',
        isEdit: false,
      }
    })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) return;
        this.expenseTableService.addExpense(result)
          .subscribe(() => {
            this.dataResource.reload();
          });
      });
  }

  public openEditExpenseModal(expense: any): void {
    console.log('expense :>> ', expense);
    this.dialog.open(ExpenseModalComponent, {
      ...this.dialogConfig,
      data: {
        expense,
        title: 'Edit expense',
        isEdit: true,
      }
    })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: IExpense) => {
        if (!result) return;
        this.expenseTableService.updateExpense(result)
          .subscribe(() => {
            this.dataResource.reload();
          });
      });
  }

  public openDeleteExpenseModal(expense: IExpense): void {
    const expenseName = expense.description?.trim() || this.languageService.t('expenses.fallbackName');
    const amount = this.formatAmount(expense.amount);

    this.dialog.open(ConfirmationModalComponent, {
      ...this.dialogConfig,
      data: {
        title: this.languageService.t('expenses.deleteTitle'),
        message: this.languageService.t('expenses.deleteMessage', {
          name: expenseName,
          amount,
        }),
        expenseId: expense.id
      },
    })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result?.confirmed) return;
        this.expenseTableService.deleteExpense(result.expenseId)
          .subscribe(() => {
            this.dataResource.reload();
          });
      });
  }

  public formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.settings().currency,
    }).format(amount);
  }

  public formatExpenseDate(date: string): string {
    return formatDate(date, this.settings().dateFormat, this.languageService.dateLocale());
  }
}
