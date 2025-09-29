import { AfterViewInit, Component, DestroyRef, inject, OnInit, viewChild } from '@angular/core';
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

import { Timestamp } from 'firebase/firestore';

import { FireStoreService } from '../services/fire-store.service';
import { AddExpenseModalComponent } from '../shared/add-expense-modal/add-expense-modal.component';
import { TimestampToDatePipe } from '../shared/pipes/timestampToDate.pipe';


@Component({
  selector: 'app-expense-table',
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSidenavModule, MatButtonModule, MatTableModule, MatPaginatorModule, MatSortModule, MatIcon, TimestampToDatePipe, DatePipe],
  templateUrl: './expense-table.component.html',
  styleUrl: './expense-table.component.scss',
  providers: []
})
export class ExpenseTableComponent implements AfterViewInit, OnInit {
  dialog = inject(MatDialog);
  destroyRef = inject(DestroyRef);
  fireStoreService = inject(FireStoreService);
  displayedColumns: string[] = ['description', 'category', 'paymentMethod', 'date', 'amount', 'createdAt'];
  dataSource = new MatTableDataSource<any>([]);

  readonly paginator = viewChild<MatPaginator>('paginator');

  ngOnInit() {
    this.getAll();
  }
  readonly sort = viewChild<MatSort>('sort');

  ngAfterViewInit() {
    const sort = this.sort();
    if (sort) {
      this.dataSource.sort = sort;
    }
  }

  getAll() {
    this.fireStoreService.getAll('expenses').then(data => {
      console.log('data', data);
      this.dataSource.data = data;
    })
  }


  public openAddExpenseModal(): void {
    this.dialog.open(AddExpenseModalComponent, {
      width: 'calc(100% - 30px)',
      maxWidth: '600px',
    })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        console.log('result :>> ', result);
        if (!result) return;
        this.fireStoreService.addItem('expenses', result);
      });
  }


}
