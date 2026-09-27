import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { IExpense } from '../../models/expense.interface';
import { ExpenseModalComponent } from './expense-modal.component';

describe('ExpenseModalComponent', () => {
  let component: ExpenseModalComponent;
  let fixture: ComponentFixture<ExpenseModalComponent>;
  let dialogRef: { close: jasmine.Spy };

  const configure = async (data: unknown) => {
    localStorage.clear();
    dialogRef = { close: jasmine.createSpy('close') };
    await TestBed.configureTestingModule({
      imports: [ExpenseModalComponent],
      providers: [
        provideNativeDateAdapter(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpenseModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  afterEach(() => localStorage.clear());

  describe('creating an operation', () => {
    beforeEach(() => configure({ isEdit: false, expense: null }));

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

    it('starts as an expense, offers expense categories and renders the type toggle', () => {
      expect(component.expenseModel().type).toBe('expense');
      const ids = component.categories().map(category => category.id);
      expect(ids).toContain('housing');
      expect(ids).not.toContain('salary');
      const toggles: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('mat-button-toggle');
      expect(Array.from(toggles).map(toggle => toggle.textContent?.trim())).toEqual(['Expense', 'Income']);
      expect(toggles[0].classList).toContain('mat-button-toggle-checked');
    });

    it('switches to income categories from the toggle and drops a category of the other type', () => {
      component.expenseModel.update(value => ({ ...value, category: 'housing' }));
      fixture.detectChanges();
      const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('mat-button-toggle button');
      buttons[1].click();
      fixture.detectChanges();

      expect(component.expenseModel().type).toBe('income');
      expect(component.expenseModel().category).toBe('');
      expect(component.categories().map(category => category.id))
        .toEqual(['salary', 'side_job', 'benefits', 'refund', 'gifts', 'other_income']);
      expect(fixture.nativeElement.querySelectorAll('mat-button-toggle')[1].classList)
        .toContain('mat-button-toggle-checked');

      component.expenseModel.update(value => ({ ...value, category: 'salary' }));
      component.setType('income');
      expect(component.expenseModel().category).toBe('salary');
      component.setType('expense');
      expect(component.expenseModel().category).toBe('');
    });

    it('submits the type together with the numeric amount', () => {
      component.setType('income');
      component.expenseModel.update(value => ({
        ...value, amount: '2500', category: 'salary', description: 'September',
      }));
      fixture.detectChanges();
      expect(component.expenseForm().invalid()).toBeFalse();

      component.addExpense();

      expect(dialogRef.close).toHaveBeenCalledWith(jasmine.objectContaining({
        type: 'income', amount: 2500, category: 'salary', description: 'September',
      }));
    });
  });

  describe('editing an operation', () => {
    const income: IExpense = {
      id: 'income-1', type: 'income', amount: 2500, category: 'salary', description: 'Salary',
      expenseDate: '2026-09-01T00:00:00Z', createdAt: '2026-09-01T00:00:00Z',
    };

    it('loads the stored type and its categories', async () => {
      await configure({ isEdit: true, expense: income });
      expect(component.expenseModel().type).toBe('income');
      expect(component.expenseModel().category).toBe('salary');
      expect(component.categories().map(category => category.id)).toContain('salary');
      const checked: HTMLElement | null = fixture.nativeElement.querySelector('mat-button-toggle.mat-button-toggle-checked');
      expect(checked?.textContent?.trim()).toBe('Income');
    });

    it('treats an operation stored without a type as an expense', async () => {
      const legacy: Partial<IExpense> = { ...income, category: 'housing' };
      delete legacy.type;
      await configure({ isEdit: true, expense: legacy });
      expect(component.expenseModel().type).toBe('expense');
      expect(component.expenseModel().category).toBe('housing');
    });

    it('lets the user change the type of an existing operation', async () => {
      await configure({ isEdit: true, expense: income });
      component.setType('expense');
      component.expenseModel.update(value => ({ ...value, category: 'housing' }));
      fixture.detectChanges();

      component.addExpense();

      expect(dialogRef.close).toHaveBeenCalledWith(jasmine.objectContaining({
        id: 'income-1', type: 'expense', category: 'housing', amount: 2500,
      }));
    });
  });
});
