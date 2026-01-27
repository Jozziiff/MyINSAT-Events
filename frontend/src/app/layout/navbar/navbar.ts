import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStateService } from '../../services/auth/auth-state';
import { Role } from '../../models/auth.models';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  private readonly authState = inject(AuthStateService);

  readonly isMobileMenuOpen = signal(false);
  readonly isAuthenticated = this.authState.isAuthenticated;
  readonly currentUser = this.authState.currentUser;
  readonly userRole = this.authState.userRole;
  readonly Role = Role; // Expose Role enum to template
  
  // Computed signal for manager/admin role check
  readonly isManager = computed(() => {
    const role = this.userRole();
    return role === Role.MANAGER || role === Role.ADMIN;
  });

  toggleMenu(): void {
    this.isMobileMenuOpen.update(value => !value);
  }

  async logout(): Promise<void> {
    await this.authState.logout();
    this.isMobileMenuOpen.set(false);
  }
}
