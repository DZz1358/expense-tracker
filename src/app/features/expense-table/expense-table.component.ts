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
import { formatDate } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { form, FormField } from '@angular/forms/signals';
import { MatSelectModule } from '@angular/material/select';
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
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSidenavModule, MatButtonModule, MatTableModule, MatPaginatorModule, MatSortModule, MatIcon, MatCardModule, ButtonComponent, CategoryIconPipe, CategoryLabelPipe, CategoryColorPipe, MatSelectModule, FormField, SkeletonComponent, TranslatePipe],
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
  displayedColumns: string[] = ['description', 'category', 'expenseDate', 'amount', 'settings'];
  readonly settings = this.appSettingsService.settings;

  readonly tableFormModel = signal({ category: '' });
  readonly tableForm = form(this.tableFormModel);
  readonly sortState = signal<{ sortBy: ExpenseSortBy; sortOrder: ExpenseSortOrder }>({
    sortBy: 'expenseDate', sortOrder: 'desc',
  });
  readonly filters = computed<ExpenseQuery>(() => {
    const { category } = this.tableFormModel();
    const { sortBy, sortOrder } = this.sortState();
    return expenseQueryBody({
      category,
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
  readonly dataResource = httpResource<ExpensePage>(() => ({
    url: `${environment.apiUrl}/expenses`,
    method: 'QUERY',
    body: this.query(),
    headers: { 'Content-Type': 'application/json' },
  }));
  readonly expenses = computed(() => this.dataResource.value()?.items ?? []);
  readonly length = computed(() => this.dataResource.value()?.pagination.total ?? 0);
  readonly hasExpenses = computed(() => this.expenses().length > 0);
  readonly hasCategoryFilter = computed(() => !!this.tableFormModel().category);
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
