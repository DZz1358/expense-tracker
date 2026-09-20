import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ExpenseModalComponent } from './expense-modal.component';

describe('ExpenseModalComponent', () => {
  let component: ExpenseModalComponent;
  let fixture: ComponentFixture<ExpenseModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseModalComponent],
      providers: [
        provideNativeDateAdapter(),
        { provide: MAT_DIALOG_DATA, useValue: { isEdit: false, expense: null } },
        { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpenseModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('accepts at most two decimal places', () => {
    component.expenseModel.update(value => ({ ...value, amount: '12.345' }));
    fixture.detectChanges();
    expect(component.expenseForm.amount().errors().map(error => error.message))
      .toContain('Up to 2 decimal places are allowed');

    component.expenseModel.update(value => ({ ...value, amount: '12.34' }));
    fixture.detectChanges();
    expect(component.expenseForm.amount().errors()).toEqual([]);
  });

  it('rejects amounts above the backend safe-integer limit', () => {
    component.expenseModel.update(value => ({ ...value, amount: '90071992547410' }));
    fixture.detectChanges();
    expect(component.expenseForm.amount().errors().map(error => error.message))
      .toContain('Amount is too large');
  });
});
