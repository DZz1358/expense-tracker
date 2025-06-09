import { Routes } from '@angular/router';
import { ExpenseTableComponent } from './expense-table/expense-table.component';

export const routes: Routes = [
  {
    path: '',
    component: ExpenseTableComponent,
    pathMatch: 'full'
  },
  {
    path: 'expenses-table',
    component: ExpenseTableComponent,
  },
];


