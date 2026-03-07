import { AfterViewInit, Component, computed, DestroyRef, inject, OnInit, viewChild, signal, effect, ChangeDetectionStrategy } from '@angular/core';
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

import { FireStoreService } from '../../services/fire-store.service';
import { ViewportServiceService } from '../../services/viewport-service.service';
import { ButtonComponent } from '../../shared/button/button.component';
import { ConfirmationModalComponent } from '../../shared/confirmation-modal/confirmation-modal.component';
import { ExpenseModalComponent } from '../../shared/expense-modal/expense-modal.component';
import { CategoryColorPipe } from '../../shared/pipes/category-color.pipe';
import { CategoryIconPipe } from '../../shared/pipes/category-icon.pipe';
import { CategoryLabelPipe } from '../../shared/pipes/category-label.pipe';
import { TimestampToDatePipe } from '../../shared/pipes/timestampToDate.pipe';

@Component({
  selector: 'app-expense-table',
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSidenavModule, MatButtonModule, MatTableModule, MatPaginatorModule, MatSortModule, MatIcon, TimestampToDatePipe, DatePipe, MatCardModule, ButtonComponent, CategoryIconPipe, CategoryLabelPipe, CategoryColorPipe],
  templateUrl: './expense-table.component.html',
  styleUrl: './expense-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpenseTableComponent implements AfterViewInit, OnInit {
  dialog = inject(MatDialog);
  destroyRef = inject(DestroyRef);
  fireStoreService = inject(FireStoreService);
  viewportServiceService = inject(ViewportServiceService);
  displayedColumns: string[] = ['description', 'category', 'date', 'amount', 'createdAt', 'settings'];
  dataSource = new MatTableDataSource<any>([]);

  length = signal<number>(0);
  pageSize = signal<number>(10);
  pageNumber = signal<number>(0);
  readonly pageSizeOptions = [1, 3, 5, 10, 25, 50];
  allData = signal<any[]>([]);

  paginatedCards = computed(() => {
    const start = this.pageNumber() * this.pageSize();
    const end = start + this.pageSize();
    return this.allData().slice(start, end);
  });

  readonly paginator = viewChild<MatPaginator>('paginator');
  readonly sort = viewChild<MatSort>('sort');
  private readonly dialogConfig = {
    disableClose: true,
    width: 'calc(100% - 30px)',
    maxWidth: '600px',
  };

  constructor() {
    effect(() => {
    })
  }

  ngOnInit() {
    this.getAll();
  }

  getAll() {
    this.fireStoreService.getAll('expenses').then(data => {
      console.log('data', data);
      this.allData.set(data);
      this.dataSource.data = data;
      this.length.set(data.length);
    })
  }

  ngAfterViewInit() {
    const sort = this.sort();
    if (sort) {
      this.dataSource.sort = sort;
    }
    const paginator = this.paginator();
    if (paginator) {
      this.dataSource.paginator = paginator;
    }
  }

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
        this.getAll();
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
        this.getAll();
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
        this.getAll();
      });
  }

}
