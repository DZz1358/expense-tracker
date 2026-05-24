import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

export type SnackbarVariant = 'info' | 'success' | 'warning' | 'error';

export interface SnackbarOptions {
  action?: string;
  duration?: number;
  variant?: SnackbarVariant;
}

const DEFAULT_DURATION: Record<SnackbarVariant, number> = {
  info: 3500,
  success: 3000,
  warning: 4500,
  error: 5000,
};

@Injectable({
  providedIn: 'root',
})
export class SnackbarService {
  private readonly snackBar = inject(MatSnackBar);

  show(message: string, options: SnackbarOptions = {}): void {
    const variant = options.variant ?? 'info';
    const config: MatSnackBarConfig = {
      duration: options.duration ?? DEFAULT_DURATION[variant],
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
      panelClass: ['app-snackbar', `app-snackbar--${variant}`],
    };

    this.snackBar.open(message, options.action, config);
  }

  info(message: string, options: Omit<SnackbarOptions, 'variant'> = {}): void {
    this.show(message, { ...options, variant: 'info' });
  }

  success(message: string, options: Omit<SnackbarOptions, 'variant'> = {}): void {
    this.show(message, { ...options, variant: 'success' });
  }

  warning(message: string, options: Omit<SnackbarOptions, 'variant'> = {}): void {
    this.show(message, { ...options, variant: 'warning' });
  }

  error(message: string, options: Omit<SnackbarOptions, 'variant'> = {}): void {
    this.show(message, { ...options, variant: 'error' });
  }

  dismiss(): void {
    this.snackBar.dismiss();
  }
}
