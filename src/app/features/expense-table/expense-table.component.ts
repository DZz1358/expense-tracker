import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIcon } from '@angular/material/icon';
import { formatDate } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { form, FormField } from '@angular/forms/signals';
import { MatSelectModule } from '@angular/material/select';
import { httpResource } from '@angular/common/http';

import { IExpense } from '../../models/expense.interface';
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
  dataSource = new MatTableDataSource<any>([]);

  length = computed(() => this.filteredData().length);
  pageSize = signal<number>(this.appSettingsService.settings().defaultPageSize);
  pageNumber = signal<number>(0);
  readonly pageSizeOptions = [1, 3, 5, 10, 25, 50];
  readonly settings = this.appSettingsService.settings;

  allData = computed<IExpense[]>(() => this.dataResource.value() ?? []);
  hasExpenses = computed(() => this.allData().length > 0);
  hasFilteredExpenses = computed(() => this.filteredData().length > 0);
  selectedCategoryLabel = computed(() => {
    const selectedCategory = this.tableFormModel().category;
    const category = this.appSettingsService.getCategory(selectedCategory);

    if (!category) {
      return this.languageService.t('category.all');
    }

    return category.custom ? category.label : this.languageService.t(`category.${category.id}`);
  });

  filteredData = computed<IExpense[]>(() => {
    const selectedCategory = this.tableFormModel().category;

    if (!selectedCategory) {
      return this.allData();
    }

    return this.allData().filter((expense) => expense.category === selectedCategory);
  });

  paginatedCards = computed<IExpense[]>(() => {
    const start = this.pageNumber() * this.pageSize();
    const end = start + this.pageSize();
    return this.filteredData().slice(start, end);
  });

  dataResource = httpResource<IExpense[]>(() => `${environment.apiUrl}/expenses`);

  readonly paginator = viewChild<MatPaginator>('paginator');
  readonly sort = viewChild<MatSort>('sort');
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

  tableFormModel = signal({
    category: '',
  })

  tableForm = form(this.tableFormModel);

  constructor() {
    effect(() => {
      this.tableFormModel().category;
      this.pageNumber.set(0);
    });

    effect(() => {
      const paginator = this.paginator();
      if (paginator) {
        this.dataSource.paginator = paginator;
      }
    });

    effect(() => {
      const sort = this.sort();
      if (sort) {
        this.dataSource.sort = sort;
        sort.sort({
          id: 'expenseDate',
          start: 'desc',
          disableClear: true,
        });
      }
    });

    effect(() => {
      this.dataSource.data = this.filteredData();
    });
  }

  onPageChange(event: PageEvent) {
    this.pageSize.set(event.pageSize);
    this.pageNumber.set(event.pageIndex);
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
    return formatDate(date, this.settings().dateFormat, 'en-GB');
  }
}
