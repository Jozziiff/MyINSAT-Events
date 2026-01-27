import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { User, AuthResponse, LoginRequest, RegisterRequest } from '../../models/auth.models';
import { TokenService } from './token';
import { AuthApiService } from './auth-api';

@Injectable({
  providedIn: 'root',
})
export class AuthStateService {
  private readonly tokenService = inject(TokenService);
  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);

  // State signals
  private readonly currentUserSignal = signal<User | null>(null);
  private readonly isLoadingSignal = signal<boolean>(false);

  // Public readonly signals
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();

  // Computed signals
  readonly isAuthenticated = computed(() => !!this.currentUserSignal());
  readonly userRole = computed(() => this.currentUserSignal()?.role ?? null);

  /**
   * Initialize auth state by loading user from stored token
   */
  async initialize(): Promise<void> {
    if (!this.tokenService.hasAccessToken()) {
      return;
    }

    this.isLoadingSignal.set(true);
    try {
      const user = await firstValueFrom(this.authApi.getProfile());
      this.currentUserSignal.set(user);
    } catch (error) {
      // Token is invalid or expired, clear it
      // Log for debugging (in production, consider sending to error monitoring service)
      console.debug('Failed to load user profile on initialization:', error);
      this.clearAuth();
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Register a new user
   * @throws Error if registration fails - should be handled by the calling component
   */
  async register(data: RegisterRequest): Promise<void> {
    this.isLoadingSignal.set(true);
    try {
      const response = await firstValueFrom(this.authApi.register(data));
      this.handleAuthResponse(response);
    } catch (error) {
      // Re-throw error so component can handle it and show user feedback
      throw error;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Login user
   * @throws Error if login fails - should be handled by the calling component
   */
  async login(data: LoginRequest): Promise<void> {
    this.isLoadingSignal.set(true);
    try {
      const response = await firstValueFrom(this.authApi.login(data));
      this.handleAuthResponse(response);
    } catch (error) {
      // Re-throw error so component can handle it and show user feedback
      throw error;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      // Call backend logout (best effort)
      await firstValueFrom(this.authApi.logout());
    } catch (error) {
      // Ignore errors, clear local state anyway
    } finally {
      this.clearAuth();
      this.router.navigate(['/login']);
    }
  }

  /**
   * Handle successful auth response
   */
  private handleAuthResponse(response: AuthResponse): void {
    this.tokenService.setTokens(response.accessToken, response.refreshToken);
    this.currentUserSignal.set(response.user);
  }

  /**
   * Clear authentication state
   */
  private clearAuth(): void {
    this.tokenService.clearTokens();
    this.currentUserSignal.set(null);
  }

  /**
   * Update current user (after profile update, etc.)
   */
  setUser(user: User): void {
    this.currentUserSignal.set(user);
  }

  /**
   * Clear user (for logout from interceptor)
   */
  clearUser(): void {
    this.clearAuth();
  }
}
