import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStateService } from '../services/auth/auth-state';

/**
 * Guest Guard - Prevents authenticated users from accessing guest-only pages
 * 
 * Redirects authenticated users away from login/register pages
 */
export const guestGuard: CanActivateFn = (route, state) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  // If user is authenticated, redirect to home
  if (authState.isAuthenticated()) {
    return router.createUrlTree(['/']);
  }

  // Allow access to guest pages
  return true;
};
