import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Observable, map } from 'rxjs';

import { AppSettings } from '../../core/services/app-settings.service';
import { UnsavedChangesComponent } from '../../core/guards/unsaved-changes.guard';
import {
  ConfirmationModalComponent,
  ConfirmationModalData,
  ConfirmationModalResult,
} from '../../shared/confirmation-modal/confirmation-modal.component';
import { LanguageService } from '../../core/i18n/language.service';
import { Theme } from '../../shared/theme/theme.enum';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import {
  CustomCategoryModalComponent,
  CustomCategoryModalData,
} from './custom-category-modal/custom-category-modal.component';
import { CustomCategoryChanges, SettingsFacade } from './settings.facade';

const DIALOG_WIDTH = 'calc(100% - 30px)';
const DEFAULT_DIALOG_MAX_WIDTH = '520px';
const CLEAR_DIALOG_MAX_WIDTH = '600px';

@Component({
  selector: 'app-settings',
  imports: [
    FormsModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatSlideToggleModule,
    TranslatePipe,
  ],
  providers: [SettingsFacade],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent implements UnsavedChangesComponent {
  private readonly settingsFacade = inject(SettingsFacade);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly languageService = inject(LanguageService);

  readonly Theme = Theme;
  readonly settings = this.settingsFacade.settings;
  readonly activeTheme = this.settingsFacade.activeTheme;
  readonly isWorking = this.settingsFacade.isWorking;
  readonly isSavingSettings = this.settingsFacade.isSavingSettings;
  readonly hasUnsavedChanges = this.settingsFacade.hasUnsavedChanges;
  readonly currencyOptions = this.settingsFacade.currencyOptions;
  readonly dateFormatOptions = this.settingsFacade.dateFormatOptions;
  readonly languageOptions = this.settingsFacade.languageOptions;

  constructor() {
    this.settingsFacade.init();
  }

  updateSetting<TKey extends keyof AppSettings>(key: TKey, value: AppSettings[TKey]): void {
    this.settingsFacade.updateSetting(key, value);
  }

  toggleTheme(): void {
    this.settingsFacade.toggleTheme();
  }

  resetSettings(): void {
    this.settingsFacade.resetSettings();
  }

  saveSettings(): void {
    this.settingsFacade.saveSettings();
  }

  openAddCustomCategoryModal(): void {
    this.openCustomCategoryDialog({ mode: 'create' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((category) => this.settingsFacade.addCustomCategory(category));
  }

  removeCustomCategory(categoryId: string): void {
    this.settingsFacade.removeCustomCategory(categoryId);
  }

  editCustomCategory(categoryId: string): void {
    const category = this.settingsFacade.getCustomCategory(categoryId);
    if (!category) return;

    this.openCustomCategoryDialog({ mode: 'edit', category })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((changes) => this.settingsFacade.updateCustomCategory(category.id, changes));
  }

  openClearExpensesModal(): void {
    this.settingsFacade.loadExpensesForClear()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (expenses) => {
          if (!expenses.length) {
            this.settingsFacade.notifyNoExpensesToClear();
            return;
          }

          this.openClearExpensesDialog(expenses.length)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((result) => {
              if (!this.isConfirmed(result)) return;
              this.settingsFacade.clearExpenses(expenses);
            });
        },
        error: () => this.settingsFacade.notifyLoadExpensesFailed(),
      });
  }

  canDeactivate(): boolean | Observable<boolean> {
    const canDeactivate = this.settingsFacade.canDeactivate();
    if (canDeactivate !== null) return canDeactivate;

    return this.openConfirmationDialog({
      title: this.languageService.t('settings.unsavedTitle'),
      message: this.languageService.t('settings.unsavedMessage'),
      confirmButtonLabel: this.languageService.t('settings.discardChanges'),
    })
      .pipe(map((result) => this.isConfirmed(result)));
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (!this.settingsFacade.shouldWarnBeforeUnload()) return;

    event.preventDefault();
    event.returnValue = '';
  }

  private openClearExpensesDialog(expensesCount: number): Observable<ConfirmationModalResult | false | undefined> {
    return this.openConfirmationDialog(
      {
        title: this.languageService.t('settings.clearTitle'),
        message: this.languageService.t('settings.clearMessageWithCount', {
          count: expensesCount,
        }),
        confirmationText: 'DELETE',
        confirmButtonLabel: this.languageService.t('common.delete'),
      },
      CLEAR_DIALOG_MAX_WIDTH,
    );
  }

  private openConfirmationDialog(
    data: ConfirmationModalData,
    maxWidth = DEFAULT_DIALOG_MAX_WIDTH,
  ): Observable<ConfirmationModalResult | false | undefined> {
    return this.dialog.open<ConfirmationModalComponent, ConfirmationModalData, ConfirmationModalResult | false>(
      ConfirmationModalComponent,
      {
        width: DIALOG_WIDTH,
        maxWidth,
        data,
      },
    ).afterClosed();
  }

  private openCustomCategoryDialog(
    data: CustomCategoryModalData,
  ): Observable<CustomCategoryChanges | null | undefined> {
    return this.dialog.open<CustomCategoryModalComponent, CustomCategoryModalData, CustomCategoryChanges | null>(
      CustomCategoryModalComponent,
      {
        width: DIALOG_WIDTH,
        maxWidth: DEFAULT_DIALOG_MAX_WIDTH,
        data,
      },
    ).afterClosed();
  }

  private isConfirmed(result: ConfirmationModalResult | false | undefined): boolean {
    return Boolean(result && result.confirmed);
  }
}
