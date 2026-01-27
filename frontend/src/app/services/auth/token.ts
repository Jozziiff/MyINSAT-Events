import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TokenService {
  /**
   * Note: Storing tokens in localStorage is vulnerable to XSS attacks.
   * In production, consider:
   * 1. Using httpOnly cookies (requires backend support)
   * 2. Implementing Content Security Policy
   * 3. Using a secure token storage library
   * 
   * Current implementation uses localStorage for simplicity and compatibility.
   */
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  setAccessToken(token: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
  }

  setRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }

  setTokens(accessToken: string, refreshToken: string): void {
    this.setAccessToken(accessToken);
    this.setRefreshToken(refreshToken);
  }

  clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  hasAccessToken(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Check if user appears to be authenticated (has token)
   * Note: This only checks for token presence, not validity.
   * For actual authentication state, use AuthStateService.isAuthenticated() 
   * which validates against loaded user data.
   */
  isAuthenticated(): boolean {
    return this.hasAccessToken();
  }
}
