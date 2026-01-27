import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStateService } from '../services/auth/auth-state';

/**
 * Auth Guard - Protects routes that require authentication
 * 
 * Redirects to login page if user is not authenticated
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  if (authState.isAuthenticated()) {
    return true;
  }

  // Store the attempted URL for redirecting after login
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};
