import { Component, inject, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from "@angular/router";

import { AuthService } from '../../core/services/auth.service';
import { ViewportServiceService } from '../../core/services/viewport-service.service';

@Component({
  selector: 'app-header',
  imports: [MatIconModule, MatButtonModule, MatToolbarModule, MatMenuModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  private readonly authService = inject(AuthService);
  viewportServiceService = inject(ViewportServiceService);
  avatarUrl = signal('/cat.jpg');
  menuClick = output<void>();

  logOut() {
    this.authService.logout();
  }
}
