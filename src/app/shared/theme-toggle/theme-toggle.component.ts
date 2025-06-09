import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ThemeService } from '../theme/theme.service';

@Component({
  selector: 'app-theme-toggle',
  imports: [MatIconModule, MatSlideToggleModule],
  templateUrl: './theme-toggle.component.html',
  styleUrl: './theme-toggle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ThemeToggleComponent {
  #themeService = inject(ThemeService);
  themeIcon = this.#themeService.themeIcon;
  activeTheme = this.#themeService.activeTheme;

  toggleTheme(): void {
    this.#themeService.toggleTheme();
  }

}
