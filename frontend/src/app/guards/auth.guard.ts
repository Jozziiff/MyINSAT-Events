import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStateService } from '../services/auth/auth-state';


export const authGuard: CanActivateFn = ( state) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  if (authState.isAuthenticated()) {
    return true;
  }


  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};
