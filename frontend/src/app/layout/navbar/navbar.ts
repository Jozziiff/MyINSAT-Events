import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
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
  animations: [
    trigger('nameHoverAnimation', [
      state('default', style({
        color: 'var(--color-primary-light)',
        transform: 'scale(1)',
        textShadow: 'none',
      })),
      state('hover', style({
        color: 'var(--color-accent)',
        transform: 'scale(1.08) translateY(-2px)',
        textShadow: '0 2px 16px var(--color-primary)',
      })),
      transition('default <=> hover', [
        animate('220ms cubic-bezier(0.4,0,0.2,1)')
      ]),
    ])
  ]
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
  readonly isAdmin = computed(() => this.userRole() === Role.ADMIN);

  nameHoverState = 'default';

  onNameMouseEnter() {
    this.nameHoverState = 'hover';
  }
  onNameMouseLeave() {
    this.nameHoverState = 'default';
  }

  toggleMenu(): void {
    this.isMobileMenuOpen.update(value => !value);
  }

  async logout(): Promise<void> {
    await this.authState.logout();
    this.isMobileMenuOpen.set(false);
  }
}
