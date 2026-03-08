import { AfterViewInit, Component, computed, DestroyRef, inject, OnInit, viewChild, signal, effect, ChangeDetectionStrategy, resource } from '@angular/core';
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
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { form, FormField } from '@angular/forms/signals';
import { MatSelectModule } from '@angular/material/select';

import { EXPENSE_CATEGORY_LIST } from '../../mocks/expense-categories';
import { IExpense } from '../../models/expense.interface';
import { FireStoreService } from '../../services/fire-store.service';
import { ViewportServiceService } from '../../services/viewport-service.service';
import { ButtonComponent } from '../../shared/button/button.component';
import { ConfirmationModalComponent } from '../../shared/confirmation-modal/confirmation-modal.component';
import { ExpenseModalComponent } from '../../shared/expense-modal/expense-modal.component';
import { CategoryColorPipe } from '../../shared/pipes/category-color.pipe';
import { CategoryIconPipe } from '../../shared/pipes/category-icon.pipe';
import { CategoryLabelPipe } from '../../shared/pipes/category-label.pipe';
import { TimestampToDatePipe } from '../../shared/pipes/timestampToDate.pipe';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';

@Component({
  selector: 'app-expense-table',
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSidenavModule, MatButtonModule, MatTableModule, MatPaginatorModule, MatSortModule, MatIcon, TimestampToDatePipe, DatePipe, MatCardModule, ButtonComponent, CategoryIconPipe, CategoryLabelPipe, CategoryColorPipe, MatSelectModule, FormField, SkeletonComponent],
  templateUrl: './expense-table.component.html',
  styleUrl: './expense-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpenseTableComponent {
  dialog = inject(MatDialog);
  destroyRef = inject(DestroyRef);
  fireStoreService = inject(FireStoreService);
  viewportServiceService = inject(ViewportServiceService);
  displayedColumns: string[] = ['description', 'category', 'date', 'amount', 'createdAt', 'settings'];
  dataSource = new MatTableDataSource<any>([]);

  length = computed(() => this.allData().length);
  pageSize = signal<number>(10);
  pageNumber = signal<number>(0);
  readonly pageSizeOptions = [1, 3, 5, 10, 25, 50];

  allData = computed<IExpense[]>(() => this.dataResource.value() ?? []);

  paginatedCards = computed<IExpense[]>(() => {
    const start = this.pageNumber() * this.pageSize();
    const end = start + this.pageSize();
    return this.allData().slice(start, end);
  });

  dataResource = resource<IExpense[], void>({
    loader: async () => {
      const data = await this.fireStoreService.getAll<IExpense>('expenses');
      this.dataSource.data = data;
      return data;
    },
  });

  readonly paginator = viewChild<MatPaginator>('paginator');
  readonly sort = viewChild<MatSort>('sort');
  private readonly dialogConfig = {
    disableClose: true,
    width: 'calc(100% - 30px)',
    maxWidth: '600px',
  };

  categories = computed(() => {
    return [{ id: '', label: 'All Categories', color: '', icon: '' }, ...EXPENSE_CATEGORY_LIST]
  })

  tableFormModel = signal({
    category: '',
  })

  tableForm = form(this.tableFormModel);

  constructor() {
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      if (!filter) return true;
      return data.category === filter;
    };

    effect(() => {
      const selectedCategory = this.tableFormModel().category;
      this.dataSource.filter = selectedCategory ?? '';
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
          id: 'createdAt',
          start: 'desc',
          disableClear: true,
        });
      }
    });
  }

  // ngOnInit() {
  //   this.getAll();
  // }

  // getAll() {
  //   this.fireStoreService.getAll('expenses').then(data => {
  //     this.allData.set(data);
  //     this.dataSource.data = data;
  //     this.length.set(data.length);
  //   })
  // }

  onPageChange(event: PageEvent) {
    this.pageSize.set(event.pageSize);
    this.pageNumber.set(event.pageIndex);
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
        this.fireStoreService.addItem('expenses', result);
        this.dataResource.reload();
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
      .subscribe((result) => {
        if (!result) return;
        this.fireStoreService.updateItem('expenses', expense.id, result);
        this.dataResource.reload();
      });
  }

  public openDeleteExpenseModal(expenseId: string): void {
    this.dialog.open(ConfirmationModalComponent, {
      ...this.dialogConfig,
      data: {
        title: 'Delete Expense',
        message: 'Are you sure you want to delete this expense?',
        expenseId: expenseId
      },
    })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result.confirmed) return;
        this.fireStoreService.deleteItem('expenses', result.expenseId);
        this.dataResource.reload();
      });
  }

}
