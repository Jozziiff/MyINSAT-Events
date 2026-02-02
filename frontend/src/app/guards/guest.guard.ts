import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStateService } from '../services/auth/auth-state';


export const guestGuard: CanActivateFn = () => {
  const authState = inject(AuthStateService);
  const router = inject(Router);


  if (authState.isAuthenticated()) {
    return router.createUrlTree(['/']);
  }

  return true;
};
