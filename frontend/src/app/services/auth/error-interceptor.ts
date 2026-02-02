import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, map, throwError } from 'rxjs';
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

      // Use the token refresh service to coordinate refresh requests
      return tokenRefreshService.refreshToken(() => {
        return authApi.refreshTokens({ refreshToken }).pipe(
          map((tokens) => {
            // Store new tokens
            tokenService.setTokens(tokens.accessToken, tokens.refreshToken);
            return tokens.accessToken; // Return just the access token
          })
        );
      }).pipe(
        switchMap((newAccessToken) => {
          // Clone the original request with new token
          const clonedRequest = req.clone({
            setHeaders: {
              Authorization: `Bearer ${newAccessToken}`,
            },
          });

          // Retry the original request
          return next(clonedRequest);
        }),
        catchError((refreshError) => {
          // Refresh failed, logout user
          authState.clearUser();
          router.navigate(['/login']);
          return throwError(() => refreshError);
        })
      );
    })
  );
};
