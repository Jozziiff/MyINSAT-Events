import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { EventsComponent } from './pages/events/events';
import { ClubsComponent } from './pages/clubs/clubs';
import { ProfilePage } from './pages/profile/profile-page/profile-page';
import { ManagerDashboardComponent } from './pages/manager/manager-dashboard';
import { EventFormComponent } from './pages/manager/event-form';
import { RegistrationsManagerComponent } from './pages/manager/registrations-manager';
import { ClubSettingsComponent } from './pages/manager/club-settings';
import { ClubDetailComponent } from './pages/club-detail/club-detail';
import { ClubFormComponent } from './pages/club-form/club-form';
import { ClubEventsComponent } from './pages/club-events/club-events';
import { EventDetailComponent } from './pages/event-detail/event-detail';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'events', component: EventsComponent },
  { path: 'clubs', component: ClubsComponent },
  { path: 'profile', component: ProfilePage},
  { path: 'manager', component: ManagerDashboardComponent },
  { path: 'manager/club', component: ClubSettingsComponent },
  { path: 'manager/events/new', component: EventFormComponent },
  { path: 'manager/events/:id/edit', component: EventFormComponent },
  { path: 'manager/events/:eventId/registrations', component: RegistrationsManagerComponent },
  { path: 'events/:id', component: EventDetailComponent },
  { path: 'clubs/new', component: ClubFormComponent },
  { path: 'clubs/:id', component: ClubDetailComponent },
  { path: 'clubs/:id/edit', component: ClubFormComponent },
  { path: 'clubs/:id/events', component: ClubEventsComponent }
];
