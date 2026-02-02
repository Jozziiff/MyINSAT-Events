import { Injectable } from '@angular/core';
import { Observable, defer, finalize, share, Subject } from 'rxjs';

/**
 * Token Refresh Service - Coordinates token refresh operations
 * 
 * Uses RxJS operators to automatically handle concurrent refresh requests.
 * Multiple simultaneous calls to refreshToken() will share the same underlying request.
 */
@Injectable({
  providedIn: 'root',
})
export class TokenRefreshService {
  private currentRefresh$: Observable<string> | null = null;

  /**
   * Execute a token refresh operation
   * Multiple concurrent calls will share the same refresh request
   */
  refreshToken(refreshFn: () => Observable<string>): Observable<string> {
    // If there's already a refresh in progress, return the shared observable
    if (this.currentRefresh$) {
      return this.currentRefresh$;
    }

    // Create a new refresh observable that cleans up when complete
    this.currentRefresh$ = defer(() => refreshFn()).pipe(
      share({
        connector: () => new Subject(),
        resetOnError: false,
        resetOnComplete: false,
        resetOnRefCountZero: false,
      }),
      finalize(() => {
        // Clean up reference after completion/error
        this.currentRefresh$ = null;
      })
    );

    return this.currentRefresh$;
  }
}
