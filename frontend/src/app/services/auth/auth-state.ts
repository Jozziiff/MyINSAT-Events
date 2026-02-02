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

  
  private readonly currentUserSignal = signal<User | null>(null);
  private readonly isLoadingSignal = signal<boolean>(false);

 
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();

  
  readonly isAuthenticated = computed(() => !!this.currentUserSignal());
  readonly userRole = computed(() => this.currentUserSignal()?.role ?? null);


  async initialize(): Promise<void> {
    if (!this.tokenService.hasAccessToken()) {
      return;
    }

    this.isLoadingSignal.set(true);
    try {
      const user = await firstValueFrom(this.authApi.getProfile());
      this.currentUserSignal.set(user);
    } catch (error) {

      this.clearAuth();
    } finally {
      this.isLoadingSignal.set(false);
    }
  }


  async register(data: RegisterRequest): Promise<void> {
    this.isLoadingSignal.set(true);
    try {
      const response = await firstValueFrom(this.authApi.register(data));
      this.handleAuthResponse(response);
    } catch (error) {
     
      throw error;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }


  async login(data: LoginRequest): Promise<void> {
    this.isLoadingSignal.set(true);
    try {
      const response = await firstValueFrom(this.authApi.login(data));
      this.handleAuthResponse(response);
    } catch (error) {
    
      throw error;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  async logout(): Promise<void> {
    try {
    
      await firstValueFrom(this.authApi.logout());
    } catch (error) {
    
    } finally {
      this.clearAuth();
      this.router.navigate(['/login']);
    }
  }


  private handleAuthResponse(response: AuthResponse): void {
    this.tokenService.setTokens(response.accessToken, response.refreshToken);
    this.currentUserSignal.set(response.user);
  }


  private clearAuth(): void {
    this.tokenService.clearTokens();
    this.currentUserSignal.set(null);
  }

  clearUser(): void {
    this.clearAuth();
  }
}
