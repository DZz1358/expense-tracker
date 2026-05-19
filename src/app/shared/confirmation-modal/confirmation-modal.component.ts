import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '../pipes/translate.pipe';

@Component({
  selector: 'app-confirmation-modal',
  imports: [MatIcon, MatDialogModule, MatButtonModule, TranslatePipe],
  templateUrl: './confirmation-modal.component.html',
  styleUrl: './confirmation-modal.component.scss'
})
export class ConfirmationModalComponent {
  dialogData = inject(MAT_DIALOG_DATA);
  dialogRef = inject(MatDialogRef);

  confirm() {
    this.dialogRef.close({ confirmed: true, expenseId: this.dialogData.expenseId });
  }
}
