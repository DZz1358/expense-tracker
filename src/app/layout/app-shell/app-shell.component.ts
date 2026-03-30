import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ViewportServiceService } from '../../core/services/viewport-service.service';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, HeaderComponent, SidebarComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  readonly viewportServiceService = inject(ViewportServiceService);

  mobileSidebarOpen = false;

  toggleMobileSidebar(): void {
    if (!this.viewportServiceService.isMobile()) {
      return;
    }

    this.mobileSidebarOpen = !this.mobileSidebarOpen;
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen = false;
  }
}
