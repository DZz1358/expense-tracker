import { Routes } from '@angular/router';

import { AnalyticsComponent } from './features/analytics/analytics.component';
import { ExpenseTableComponent } from './features/expense-table/expense-table.component';
import { ProfileComponent } from './features/profile/profile.component';
import { SettingsComponent } from './features/settings/settings.component';

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
  {
    path: 'analytics',
    component: AnalyticsComponent,
  },
  {
    path: 'profile',
    component: ProfileComponent,
  },
  {
    path: 'settings',
    component: SettingsComponent,
  },
];


