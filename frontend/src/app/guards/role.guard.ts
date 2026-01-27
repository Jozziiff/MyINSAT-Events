import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStateService } from '../services/auth/auth-state';
import { Role } from '../models/auth.models';

/**
 * Role Guard Factory - Protects routes based on required roles
 * 
 * Usage: canActivate: [roleGuard([Role.MANAGER, Role.ADMIN])]
 */
export const roleGuard = (allowedRoles: Role[]): CanActivateFn => {
  return (route, state) => {
    const authState = inject(AuthStateService);
    const router = inject(Router);

    const userRole = authState.userRole();

    // Check if user is authenticated
    if (!authState.isAuthenticated()) {
      return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url }
      });
    }

    // Check if user has required role
    if (userRole && allowedRoles.includes(userRole)) {
      return true;
    }

    // User doesn't have permission, redirect to home
    return router.createUrlTree(['/']);
  };
};
