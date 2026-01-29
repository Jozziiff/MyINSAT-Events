import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { EventsComponent } from './pages/events/events';
import { ClubsComponent } from './pages/clubs/clubs';
import { ProfilePage } from './pages/profile/profile-page/profile-page';
import { UserProfileComponent } from './pages/user-profile/user-profile';
import { ManagerDashboardComponent } from './pages/manager/manager-dashboard';
import { EventFormComponent } from './pages/manager/event-form';
import { RegistrationsManagerComponent } from './pages/manager/registrations-manager';
import { ClubSettingsComponent } from './pages/manager/club-settings';
import { ClubDetailComponent } from './pages/club-detail/club-detail';
import { ClubFormComponent } from './pages/club-form/club-form';
import { Login } from './pages/auth/login/login';
import { Register } from './pages/auth/register/register';
import { ForgotPassword } from './pages/auth/forgot-password/forgot-password';
import { ResetPassword } from './pages/auth/reset-password/reset-password';
import { VerifyEmail } from './pages/auth/verify-email/verify-email';
import { AdminDashboardComponent } from './pages/admin/admin-dashboard';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { roleGuard } from './guards/role.guard';
import { Role } from './models/auth.models';
import { ClubEventsComponent } from './pages/club-events/club-events';
import { EventDetailComponent } from './pages/event-detail/event-detail';

export const routes: Routes = [
  // Public routes
  { path: '', component: HomeComponent },
  { path: 'events', component: EventsComponent },
  { path: 'events/:id', component: EventDetailComponent },
  { path: 'clubs', component: ClubsComponent },
  { path: 'clubs/new', component: ClubFormComponent, canActivate: [authGuard] },
  { path: 'clubs/:id/edit', component: ClubFormComponent, canActivate: [authGuard] },
  { path: 'clubs/:id/events', component: ClubEventsComponent },
  { path: 'clubs/:id', component: ClubDetailComponent },
  { path: 'users/:id', component: UserProfileComponent },

  // Auth routes (guest only)
  { path: 'login', component: Login, canActivate: [guestGuard] },
  { path: 'register', component: Register, canActivate: [guestGuard] },
  { path: 'forgot-password', component: ForgotPassword, canActivate: [guestGuard] },
  { path: 'reset-password', component: ResetPassword },
  { path: 'verify-email', component: VerifyEmail },

  // Protected routes (require authentication)
  { path: 'profile', component: ProfilePage, canActivate: [authGuard] },

  // Admin routes (require ADMIN role)
  {
    path: 'admin',
    component: AdminDashboardComponent,
    canActivate: [roleGuard([Role.ADMIN])]
  },

  // Manager routes (require MANAGER or ADMIN role)
  {
    path: 'manager',
    component: ManagerDashboardComponent,
    canActivate: [roleGuard([Role.MANAGER, Role.ADMIN])]
  },
  {
    path: 'manager/club',
    component: ClubSettingsComponent,
    canActivate: [roleGuard([Role.MANAGER, Role.ADMIN])]
  },
  {
    path: 'manager/events/new',
    component: EventFormComponent,
    canActivate: [roleGuard([Role.MANAGER, Role.ADMIN])]
  },
  {
    path: 'manager/events/:id/edit',
    component: EventFormComponent,
    canActivate: [roleGuard([Role.MANAGER, Role.ADMIN])]
  },
  {
    path: 'manager/events/:eventId/registrations',
    component: RegistrationsManagerComponent,
    canActivate: [roleGuard([Role.MANAGER, Role.ADMIN])]
  },

  // Wildcard route - redirect to home
  { path: '**', redirectTo: '' }
];
