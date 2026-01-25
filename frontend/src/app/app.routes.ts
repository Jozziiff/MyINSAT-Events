import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { EventsComponent } from './pages/events/events';
import { ClubsComponent } from './pages/clubs/clubs';
import { ClubDetailComponent } from './pages/club-detail/club-detail';
import { ClubFormComponent } from './pages/club-form/club-form';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'events', component: EventsComponent },
  { path: 'clubs', component: ClubsComponent },
  { path: 'clubs/new', component: ClubFormComponent },
  { path: 'clubs/:id', component: ClubDetailComponent },
  { path: 'clubs/:id/edit', component: ClubFormComponent }
];
