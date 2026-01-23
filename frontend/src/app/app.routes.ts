import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { EventsComponent } from './pages/events/events';
import { ClubsComponent } from './pages/clubs/clubs';

export const routes: Routes = [
  { path: '', component: HomeComponent }, // Default route
  { path: 'events', component: EventsComponent },
  { path: 'clubs', component: ClubsComponent }
  // We will add login and profile here later
];
