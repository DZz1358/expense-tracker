import { Component, viewChild } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';

import { expenses } from '../mocks/table.mock';

@Component({
  selector: 'app-expense-table',
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSidenavModule, MatToolbarModule, MatButtonModule, MatTableModule, MatPaginatorModule, MatSortModule],
  templateUrl: './expense-table.component.html',
  styleUrl: './expense-table.component.scss'
})
export class ExpenseTableComponent {
  displayedColumns: string[] = ['description', 'category', 'paymentMethod', 'date', 'amount', 'createdAt'];
  dataSource = new MatTableDataSource(expenses);

  readonly paginator = viewChild<MatPaginator>('paginator');
  readonly sort = viewChild<MatSort>('sort');

  ngAfterViewInit() {
    const sort = this.sort();
    if (sort) {
      this.dataSource.sort = sort;
    }
  }
}
