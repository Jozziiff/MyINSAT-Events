import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { TokenService } from './token';
import { AuthApiService } from './auth-api';
import { AuthStateService } from './auth-state';
import { TokenRefreshService } from './token-refresh';
import { isPublicEndpoint } from './auth-constants';

/**
 * Error Interceptor - Handles 401 errors and attempts token refresh
 * 
 * Flow:
 * 1. Catches 401 Unauthorized errors
 * 2. Attempts to refresh the access token (only one refresh at a time)
 * 3. Retries the original request with new token
 * 4. If refresh fails, logs out the user
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const authApi = inject(AuthApiService);
  const authState = inject(AuthStateService);
  const router = inject(Router);
  const tokenRefreshService = inject(TokenRefreshService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Only handle 401 Unauthorized errors
      if (error.status !== 401) {
        return throwError(() => error);
      }

      // Don't attempt refresh if this was already a refresh request
      if (req.url.includes('/auth/refresh')) {
        // Refresh failed, logout user
        authState.clearUser();
        router.navigate(['/login']);
        return throwError(() => error);
      }

      // Don't attempt refresh for public endpoints
      if (isPublicEndpoint(req.url)) {
        return throwError(() => error);
      }

      // Get refresh token
      const refreshToken = tokenService.getRefreshToken();

      if (!refreshToken) {
        // No refresh token, logout user
        authState.clearUser();
        router.navigate(['/login']);
        return throwError(() => error);
      }

      // If already refreshing, wait for the refresh to complete
      if (tokenRefreshService.isRefreshInProgress()) {
        return tokenRefreshService.getRefreshToken().pipe(
          switchMap(token => {
            const clonedRequest = req.clone({
              setHeaders: {
                Authorization: `Bearer ${token}`,
              },
            });
            return next(clonedRequest);
          })
        );
      }

      // Start refresh process
      tokenRefreshService.startRefresh();

      // Attempt to refresh tokens
      return authApi.refreshTokens({ refreshToken }).pipe(
        switchMap((tokens) => {
          // Store new tokens
          tokenService.setTokens(tokens.accessToken, tokens.refreshToken);
          
          // Complete refresh and notify waiting requests
          tokenRefreshService.completeRefresh(tokens.accessToken);

          // Clone the original request with new token
          const clonedRequest = req.clone({
            setHeaders: {
              Authorization: `Bearer ${tokens.accessToken}`,
            },
          });

          // Retry the original request
          return next(clonedRequest);
        }),
        catchError((refreshError) => {
          // Mark refresh as failed
          tokenRefreshService.failRefresh();
          
          // Refresh failed, logout user
          authState.clearUser();
          router.navigate(['/login']);
          return throwError(() => refreshError);
        })
      );
    })
  );
};
