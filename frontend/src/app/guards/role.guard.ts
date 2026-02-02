import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStateService } from '../services/auth/auth-state';
import { Role } from '../models/auth.models';


export const roleGuard = (allowedRoles: Role[]): CanActivateFn => {
  return ( state) => {
    const authState = inject(AuthStateService);
    const router = inject(Router);

    const userRole = authState.userRole();

    if (!authState.isAuthenticated()) {
      return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url }
      });
    }


    if (userRole && allowedRoles.includes(userRole)) {
      return true;
    }

    return router.createUrlTree(['/']);
  };
};
