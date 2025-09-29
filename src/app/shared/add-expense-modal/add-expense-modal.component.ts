import { Component, inject, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatError, MatFormField, MatInput, MatLabel } from '@angular/material/input';

@Component({
  selector: 'app-add-expense-modal',
  imports: [MatIcon, MatDialogModule, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError],
  templateUrl: './add-expense-modal.component.html',
  styleUrl: './add-expense-modal.component.scss'
})
export class AddExpenseModalComponent {
  dialogData = inject(MAT_DIALOG_DATA);
  dialogRef = inject(MatDialogRef);
  fb = inject(FormBuilder);

  minTime = signal(new Date());
  minDate = signal(new Date());

  public get dateFC(): FormControl {
    return this.form.get('date') as FormControl;
  }

  public form = this.fb.group({
    date: [new Date(), Validators.required],
    time: ['', Validators.required],
    comment: [''],
  });

  addExpense() {
    console.log('this.form.value :>> ', this.form.value);
  }


}
