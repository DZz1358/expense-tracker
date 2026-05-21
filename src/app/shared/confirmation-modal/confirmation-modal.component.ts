import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '../pipes/translate.pipe';

export interface ConfirmationModalData {
  title?: string;
  message?: string;
  expenseId?: number | string;
  confirmationText?: string;
  confirmationLabel?: string;
  passwordRequired?: boolean;
  passwordLabel?: string;
  passwordPlaceholder?: string;
  confirmButtonLabel?: string;
}

export interface ConfirmationModalResult {
  confirmed: true;
  expenseId?: number | string;
  password?: string;
}

@Component({
  selector: 'app-confirmation-modal',
  imports: [
    FormsModule,
    MatIcon,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    TranslatePipe,
  ],
  templateUrl: './confirmation-modal.component.html',
  styleUrl: './confirmation-modal.component.scss'
})
export class ConfirmationModalComponent {
  readonly dialogData = inject<ConfirmationModalData>(MAT_DIALOG_DATA);
  readonly dialogRef = inject<MatDialogRef<ConfirmationModalComponent, ConfirmationModalResult | false>>(MatDialogRef);

  readonly confirmationInput = signal('');
  readonly password = signal('');
  readonly showPassword = signal(false);

  readonly canConfirm = computed(() => {
    const expectedText = this.dialogData.confirmationText;
    if (expectedText && this.confirmationInput().trim() !== expectedText) {
      return false;
    }

    if (this.dialogData.passwordRequired && !this.password().trim()) {
      return false;
    }

    return true;
  });

  confirm() {
    if (!this.canConfirm()) return;

    this.dialogRef.close({
      confirmed: true,
      expenseId: this.dialogData.expenseId,
      password: this.dialogData.passwordRequired ? this.password() : undefined,
    });
  }
}
