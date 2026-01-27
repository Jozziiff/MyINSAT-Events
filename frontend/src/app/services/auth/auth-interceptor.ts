import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenService } from './token';
import { isPublicEndpoint } from './auth-constants';

/**
 * Auth Interceptor - Automatically attaches access token to outgoing requests
 * 
 * Skips token attachment for public endpoints that don't require authentication
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);

  // Skip adding token for public endpoints
  if (isPublicEndpoint(req.url)) {
    return next(req);
  }

  // Get access token
  const token = tokenService.getAccessToken();

  // If no token, proceed without modification
  if (!token) {
    return next(req);
  }

  // Clone request and add Authorization header
  const clonedRequest = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(clonedRequest);
};
