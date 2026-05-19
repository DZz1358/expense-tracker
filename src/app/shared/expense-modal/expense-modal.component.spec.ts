import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ExpenseModalComponent } from './expense-modal.component';

describe('ExpenseModalComponent', () => {
  let component: ExpenseModalComponent;
  let fixture: ComponentFixture<ExpenseModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseModalComponent],
      providers: [
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
});
