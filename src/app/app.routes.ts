import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/transaction-list/transaction-list.component').then((m) => m.TransactionListComponent),
  },
];
