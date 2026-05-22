import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AppUpdateService } from './core/services/app-update.service';
import { ThemeService } from './shared/theme/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  readonly themeService = inject(ThemeService);
  private readonly appUpdateService = inject(AppUpdateService);

  constructor() {
    this.appUpdateService.init();
  }
}
