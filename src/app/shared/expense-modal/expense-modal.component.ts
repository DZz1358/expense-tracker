import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import {
  form,
  max,
  min,
  minLength,
  required,
  FormField,
  pattern,
} from '@angular/forms/signals';

import { ButtonComponent } from '../button/button.component';
import { AppSettingsService } from '../../core/services/app-settings.service';
import { LanguageService } from '../../core/i18n/language.service';
import { OPERATION_TYPES, OperationType } from '../../models/expense.interface';
import { TranslatePipe } from '../pipes/translate.pipe';
import { CategoryLabelPipe } from '../pipes/category-label.pipe';
@Component({
  selector: 'app-expense-modal',
  imports: [
    MatIconModule,
    MatDialogModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatButtonToggleModule,
    ButtonComponent,
    FormField,
    TranslatePipe,
    CategoryLabelPipe,
  ],
  templateUrl: './expense-modal.component.html',
  styleUrl: './expense-modal.component.scss',
})
export class ExpenseModalComponent {
  dialogData = inject(MAT_DIALOG_DATA);
  dialogRef = inject(MatDialogRef);
  appSettingsService = inject(AppSettingsService);
  languageService = inject(LanguageService);

  readonly operationTypeOptions = OPERATION_TYPES.map((type) => ({
    value: type,
    labelKey: `operation.${type}`,
  }));

  expenseModel = signal({
    type: 'expense' as OperationType,
    amount: '',
    category: '',
    description: '',
    expenseDate: new Date(),
  });

  /** Only the categories that belong to the selected operation type. */
  categories = computed(() => this.appSettingsService.categoriesOf(this.expenseModel().type));

  expenseForm = form(this.expenseModel, (expense) => {
    required(expense.amount, {
      message: this.languageService.t('validation.amountRequired'),
    });
    min(expense.amount, 0.01, {
      message: this.languageService.t('validation.amountMin'),
    });
    pattern(expense.amount, /^\d+(\.\d+)?$/, {
      message: this.languageService.t('validation.onlyNumbers'),
    });
    // The backend DTO is @IsNumber({ maxDecimalPlaces: 2 }) and rejects 12.345
    // with a 400. The stricter pattern only kicks in once the value is numeric,
    // so a non-numeric entry still reports "only numbers" and nothing else.
    pattern(
      expense.amount,
      ({ value }) => (/^\d+(\.\d+)?$/.test(value() ?? '') ? /^\d+(\.\d{1,2})?$/ : undefined),
      { message: this.languageService.t('validation.amountDecimals') },
    );
    // Same double-precision value as MAX_EXPENSE_AMOUNT (MAX_SAFE_INTEGER / 100).
    max(expense.amount, 90071992547409.91, {
      message: this.languageService.t('validation.amountMax'),
    });

    required(expense.category, {
      message: this.languageService.t('validation.categoryRequired'),
    });

    minLength(expense.description, 2, {
      message: this.languageService.t('validation.descriptionMin'),
    });
  });

  constructor() {
    if (this.dialogData.isEdit && this.dialogData.expense) {
      this.expenseModel.set({
        ...this.expenseModel(),
        ...this.dialogData.expense,
        // Operations stored before types existed come back without one and are expenses.
        type: this.dialogData.expense.type ?? 'expense',
        expenseDate: this.dialogData.expense.expenseDate,
      });
    }
  }

  /** Switches the catalogue and drops a category that does not belong to the new type. */
  setType(type: OperationType): void {
    this.expenseModel.update((expense) => ({
      ...expense,
      type,
      category: this.appSettingsService.categoriesOf(type).some((category) => category.id === expense.category)
        ? expense.category
        : '',
    }));
  }

  addExpense() {
    const data = {
      ...this.expenseModel(),
      amount: Number(this.expenseModel().amount),
    };
    this.dialogRef.close(data);
  }
}
