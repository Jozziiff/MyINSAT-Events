import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { EventsComponent } from './pages/events/events';
import { ClubsComponent } from './pages/clubs/clubs';
import { ManagerDashboardComponent } from './pages/manager/manager-dashboard';
import { EventFormComponent } from './pages/manager/event-form';
import { RegistrationsManagerComponent } from './pages/manager/registrations-manager';
import { ClubSettingsComponent } from './pages/manager/club-settings';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'events', component: EventsComponent },
  { path: 'clubs', component: ClubsComponent },
  { path: 'manager', component: ManagerDashboardComponent },
  { path: 'manager/club', component: ClubSettingsComponent },
  { path: 'manager/events/new', component: EventFormComponent },
  { path: 'manager/events/:id/edit', component: EventFormComponent },
  { path: 'manager/events/:eventId/registrations', component: RegistrationsManagerComponent }
];
