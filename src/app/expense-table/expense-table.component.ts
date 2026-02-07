import { AfterViewInit, Component, computed, DestroyRef, HostListener, inject, OnInit, viewChild, signal, effect } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIcon } from '@angular/material/icon';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

import { FireStoreService } from '../services/fire-store.service';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal.component';
import { ExpenseModalComponent } from '../shared/expense-modal/expense-modal.component';
import { TimestampToDatePipe } from '../shared/pipes/timestampToDate.pipe';

@Component({
  selector: 'app-expense-table',
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSidenavModule, MatButtonModule, MatTableModule, MatPaginatorModule, MatSortModule, MatIcon, TimestampToDatePipe, DatePipe, MatCardModule],
  templateUrl: './expense-table.component.html',
  styleUrl: './expense-table.component.scss',
})
export class ExpenseTableComponent implements AfterViewInit, OnInit {
  dialog = inject(MatDialog);
  destroyRef = inject(DestroyRef);
  fireStoreService = inject(FireStoreService);
  displayedColumns: string[] = ['description', 'category', 'paymentMethod', 'date', 'amount', 'createdAt', 'settings'];
  dataSource = new MatTableDataSource<any>([]);

  isMobile = signal(window.innerWidth < 768);

  @HostListener('window:resize', ['$event'])
  onResize(event: UIEvent) {
    const width = (event.target as Window).innerWidth;
    this.isMobile.set(width < 768);
  }
  readonly paginator = viewChild<MatPaginator>('paginator');
  readonly sort = viewChild<MatSort>('sort');

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
      this.dataSource.data = data;
    })
  }

  ngAfterViewInit() {
    const sort = this.sort();
    if (sort) {
      this.dataSource.sort = sort;
    }
  }

  public openAddExpenseModal(): void {
    this.dialog.open(ExpenseModalComponent, {
      width: 'calc(100% - 30px)',
      maxWidth: '600px',
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
      width: 'calc(100% - 30px)',
      maxWidth: '600px',
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
      width: 'calc(100% - 30px)',
      maxWidth: '600px',
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
