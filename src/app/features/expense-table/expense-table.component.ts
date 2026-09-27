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

import { IExpense, OperationType } from '../../models/expense.interface';
import { ExpensePage, ExpenseQuery, ExpenseSortBy, ExpenseSortOrder, expenseQueryBody, legacyCompatibleCategoryFilter } from '../../models/expense-query.models';
import { ViewportServiceService } from '../../core/services/viewport-service.service';
import { environment } from '../../../environments/environment';
import { ButtonComponent } from '../../shared/button/button.component';
import { ConfirmationModalComponent } from '../../shared/confirmation-modal/confirmation-modal.component';
import { ExpenseModalComponent } from '../../shared/expense-modal/expense-modal.component';
import { CategoryColorPipe } from '../../shared/pipes/category-color.pipe';
import { CategoryIconPipe } from '../../shared/pipes/category-icon.pipe';
import { CategoryLabelPipe } from '../../shared/pipes/category-label.pipe';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { SnackbarService } from '../../shared/snackbar/snackbar.service';
import { AppSettingsService } from '../../core/services/app-settings.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

import { ExpenseTableService } from './expense-table.service';

/** `''` for type / category means "no filter". */
interface TableFilters {
  type: OperationType | '';
  category: string;
  dateFrom: string;
  dateTo: string;
  q: string;
}

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
  snackbarService = inject(SnackbarService);
  private readonly dateAdapter = inject<DateAdapter<Date>>(DateAdapter);
  displayedColumns: string[] = ['description', 'category', 'expenseDate', 'amount', 'settings'];
  readonly settings = this.appSettingsService.settings;

  readonly operationTypeOptions: Array<{ value: OperationType | ''; labelKey: string }> = [
    { value: '', labelKey: 'operation.all' },
    { value: 'expense', labelKey: 'operation.expenses' },
    { value: 'income', labelKey: 'operation.incomes' },
  ];

  readonly tableFormModel = signal<TableFilters>(this.defaultFilters());
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
    const type = this.tableForm.type().value();
    const category = this.tableForm.category().value();
    const dateFrom = this.tableForm.dateFrom().value();
    const dateTo = this.tableForm.dateTo().value();
    const { sortBy, sortOrder } = this.sortState();
    return expenseQueryBody({
      type: type || undefined,
      category: legacyCompatibleCategoryFilter(category),
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
    url: `${environment.apiUrl}/operations`,
    method: 'QUERY',
    body: this.query(),
    headers: { 'Content-Type': 'application/json' },
  }));
  readonly expenses = computed(() => this.dataResource.value()?.items ?? []);
  readonly length = computed(() => this.dataResource.value()?.pagination.total ?? 0);
  readonly hasExpenses = computed(() => this.expenses().length > 0);
  readonly hasCategoryFilter = computed(() => !!this.tableFormModel().category);
  readonly hasNonCategoryFilter = computed(() => {
    const { type, dateFrom, dateTo } = this.tableFormModel();
    return !!(type || dateFrom || dateTo || this.searchText());
  });
  readonly hasFilters = computed(() => this.hasCategoryFilter() || this.hasNonCategoryFilter());
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

  /** Category options for the selected operation type; every category when no type is selected. */
  categories = computed(() => {
    return [
      { id: '', label: this.languageService.t('category.all'), color: '', icon: '' },
      ...this.appSettingsService.categoriesOf(this.tableFormModel().type),
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

  /** Drops the category filter when it does not belong to the newly selected type. */
  onTypeChange(type: OperationType | ''): void {
    this.tableFormModel.update((filters) => ({
      ...filters,
      type,
      category: this.appSettingsService.categoriesOf(type).some((category) => category.id === filters.category)
        ? filters.category
        : '',
    }));
  }

  clearCategoryFilter(): void {
    this.tableFormModel.update((value) => ({
      ...value,
      category: '',
    }));
  }

  clearFilters(): void {
    this.tableFormModel.set({ type: '', category: '', dateFrom: '', dateTo: '', q: '' });
    this.debouncedSearch.set('');
  }

  onDateRangeChange(field: 'dateFrom' | 'dateTo', date: Date | null): void {
    const value = date ? formatDate(date, 'yyyy-MM-dd', 'en') : '';
    this.tableFormModel.update((filters) => ({ ...filters, [field]: value }));
    this.tableForm[field]().markAsDirty();
  }

  private defaultFilters(): TableFilters {
    const today = this.dateAdapter.today();
    const year = today.getFullYear();
    const month = today.getMonth();
    return {
      type: '',
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
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.dataResource.reload();
              this.snackbarService.success(this.languageService.t('expenses.added'));
            },
            error: (error: unknown) => this.snackbarService.error(
              this.apiErrorMessage(error, 'expenses.saveFailed'),
            ),
          });
      });
  }

  public openEditExpenseModal(expense: IExpense): void {
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
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.dataResource.reload();
              this.snackbarService.success(this.languageService.t('expenses.updated'));
            },
            error: (error: unknown) => this.snackbarService.error(
              this.apiErrorMessage(error, 'expenses.saveFailed'),
            ),
          });
      });
  }

  public openDeleteExpenseModal(expense: IExpense): void {
    const expenseName = expense.description?.trim() || this.languageService.t('expenses.fallbackName');
    const amount = this.formatSignedAmount(expense);

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
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.dataResource.reload();
              this.snackbarService.success(this.languageService.t('expenses.deleted'));
            },
            error: (error: unknown) => this.snackbarService.error(
              this.apiErrorMessage(error, 'expenses.deleteFailed'),
            ),
          });
      });
  }

  /**
   * class-validator failures answer with `message: string[]`, every other
   * backend error with `message: string`. Both are folded into one line here so
   * the snackbar never renders `[object Object]` or a comma run-on.
   */
  private apiErrorMessage(error: unknown, fallbackKey: string): string {
    const message = (error as { error?: { message?: unknown } } | null)?.error?.message;

    if (Array.isArray(message)) {
      const details = message.filter((part): part is string => typeof part === 'string');
      if (details.length) return details.join('. ');
    }

    if (typeof message === 'string' && message.trim()) return message.trim();

    return this.languageService.t(fallbackKey);
  }

  public formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.settings().currency,
    }).format(amount);
  }

  /** Incomes are prefixed with `+` so they stand out from expenses in a mixed list. */
  public formatSignedAmount(operation: Pick<IExpense, 'type' | 'amount'>): string {
    const amount = this.formatAmount(operation.amount);
    return operation.type === 'income' ? `+${amount}` : amount;
  }

  public formatExpenseDate(date: string): string {
    return formatDate(date, this.settings().dateFormat, this.languageService.dateLocale());
  }
}
