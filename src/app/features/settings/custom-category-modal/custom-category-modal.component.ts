import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { ExpenseCategoryOption } from '../../../core/services/app-settings.service';
import { CATEGORY_COLOR_OPTIONS, CATEGORY_ICON_OPTIONS } from '../custom-category-options';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { LanguageService } from '../../../core/i18n/language.service';

export interface CustomCategoryModalData {
  mode: 'create' | 'edit';
  category?: ExpenseCategoryOption;
}

@Component({
  selector: 'app-custom-category-modal',
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    TranslatePipe,
  ],
  templateUrl: './custom-category-modal.component.html',
  styleUrl: './custom-category-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomCategoryModalComponent {
  private readonly dialogRef = inject(MatDialogRef<CustomCategoryModalComponent>);
  private readonly languageService = inject(LanguageService);
  readonly dialogData = inject<CustomCategoryModalData>(MAT_DIALOG_DATA);

  readonly label = signal(this.dialogData.category?.label ?? '');
  readonly icon = signal(this.dialogData.category?.icon ?? 'sell');
  readonly color = signal(this.dialogData.category?.color ?? '#607D8B');
  readonly errorMessage = signal<string | null>(null);
  readonly isEdit = this.dialogData.mode === 'edit';

  readonly categoryIconOptions = CATEGORY_ICON_OPTIONS;
  readonly categoryColorOptions = CATEGORY_COLOR_OPTIONS;

  save(): void {
    const label = this.label().trim();
    if (label.length < 2) {
      this.errorMessage.set(this.languageService.t('validation.categoryNameMin'));
      return;
    }

    this.dialogRef.close({
      label,
      icon: this.icon(),
      color: this.color(),
    });
  }

  close(): void {
    this.dialogRef.close(null);
  }
}
