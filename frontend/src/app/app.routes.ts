import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { EventsComponent } from './pages/events/events';
import { ClubsComponent } from './pages/clubs/clubs';
import { ProfilePage } from './pages/profile/profile-page/profile-page';

export const routes: Routes = [
  { path: '', component: HomeComponent }, // Default route
  { path: 'events', component: EventsComponent },
  { path: 'clubs', component: ClubsComponent },
  { path: 'profile', component: ProfilePage}
  // We will add login and profile here later
];
