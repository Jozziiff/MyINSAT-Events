import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, filter, take } from 'rxjs';

/**
 * Token Refresh Service - Manages token refresh state
 * 
 * Ensures only one token refresh happens at a time across the entire application,
 * even with multiple concurrent 401 errors.
 */
@Injectable({
  providedIn: 'root',
})
export class TokenRefreshService {
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  /**
   * Check if a token refresh is currently in progress
   */
  isRefreshInProgress(): boolean {
    return this.isRefreshing;
  }

  /**
   * Start a token refresh operation
   */
  startRefresh(): void {
    this.isRefreshing = true;
    this.refreshTokenSubject.next(null);
  }

  /**
   * Complete a token refresh operation with the new token
   */
  completeRefresh(newAccessToken: string): void {
    this.isRefreshing = false;
    this.refreshTokenSubject.next(newAccessToken);
  }

  /**
   * Fail a token refresh operation
   */
  failRefresh(): void {
    this.isRefreshing = false;
    this.refreshTokenSubject.next(null);
  }

  /**
   * Get an observable that emits when a new token is available
   * Used by waiting requests to get the new token after refresh completes
   */
  getRefreshToken(): Observable<string | null> {
    return this.refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1)
    );
  }
}
