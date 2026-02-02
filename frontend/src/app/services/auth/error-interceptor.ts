import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, map, throwError } from 'rxjs';
import { TokenService } from './token';
import { AuthApiService } from './auth-api';
import { AuthStateService } from './auth-state';
import { TokenRefreshService } from './token-refresh';


function isRefreshEndpoint(url: string): boolean {
  return url.includes('/auth/refresh');
}


export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const authApi = inject(AuthApiService);
  const authState = inject(AuthStateService);
  const router = inject(Router);
  const tokenRefreshService = inject(TokenRefreshService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      
      if (error.status !== 401) {
        return throwError(() => error);
      }

      
      if (isRefreshEndpoint(req.url)) {
        authState.clearUser();
        router.navigate(['/login']);
        return throwError(() => error);
      }

      
      const refreshToken = tokenService.getRefreshToken();

      if (!refreshToken) {

        authState.clearUser();
        return throwError(() => error);
      }

      
      return tokenRefreshService.refreshToken(() => {
        return authApi.refreshTokens({ refreshToken }).pipe(
          map((tokens) => {
            tokenService.setTokens(tokens.accessToken, tokens.refreshToken);
            return tokens.accessToken;
          })
        );
      }).pipe(
        switchMap((newAccessToken) => {
          const clonedRequest = req.clone({
            setHeaders: {
              Authorization: `Bearer ${newAccessToken}`,
            },
          });
          return next(clonedRequest);
        }),
        catchError((refreshError) => {
   
          authState.clearUser();
          router.navigate(['/login']);
          return throwError(() => refreshError);
        })
      );
    })
  );
};
