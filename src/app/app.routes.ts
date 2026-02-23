import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/expense-table/expense-table.component')
        .then(m => m.ExpenseTableComponent),
  },
  {
    path: 'expenses-table',
    loadComponent: () =>
      import('./features/expense-table/expense-table.component')
        .then(m => m.ExpenseTableComponent),
  },
  {
    path: 'analytics',
    loadComponent: () =>
      import('./features/analytics/analytics.component')
        .then(m => m.AnalyticsComponent),
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./features/profile/profile.component')
        .then(m => m.ProfileComponent),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings.component')
        .then(m => m.SettingsComponent),
  },
];


