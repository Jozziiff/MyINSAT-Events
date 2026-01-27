import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection, provideAppInitializer, inject } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './services/auth/auth-interceptor';
import { errorInterceptor } from './services/auth/error-interceptor';
import { AuthStateService } from './services/auth/auth-state';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideAnimations(),
    provideHttpClient(
      withInterceptors([authInterceptor, errorInterceptor])
    ),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled'
      })
    ),
    provideAppInitializer(() => inject(AuthStateService).initialize()),
  ]
};
