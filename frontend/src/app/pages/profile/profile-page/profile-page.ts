import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProfileHeader } from '../components/profile-header/profile-header';
import { EventSection } from '../components/event-section/event-section';
import { ClubList } from '../components/club-list/club-list';
import { StatsCard } from '../components/stats-card/stats-card';
import { RatingsSection } from '../components/ratings-section/ratings-section';
import { UserService } from '../../../services/user.service';
import { AuthStateService } from '../../../services/auth/auth-state';
import {
  UserProfile,
  UserDashboard,
  ProfileEvent,
  FollowedClub,
  UserRating,
  UserStats,
  UserRole,
} from '../../../models/profile.models';
import { RegistrationStatus } from '../../../models/event.model';
import { trigger, transition, style, animate, stagger, query } from '@angular/animations';

@Component({
  selector: 'app-profile-page',
  imports: [
    CommonModule,
    RouterModule,
    ProfileHeader,
    EventSection,
    ClubList,
    StatsCard,
    RatingsSection,
  ],
  templateUrl: './profile-page.html',
  styleUrls: ['./profile-page.css'],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('600ms cubic-bezier(0.35, 0, 0.25, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('staggerCards', [
      transition(':enter', [
        query('.animate-card', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(100, [
            animate('500ms cubic-bezier(0.35, 0, 0.25, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class ProfilePage implements OnInit {
  private userService = inject(UserService);
  private authState = inject(AuthStateService);

  loading = signal(true);
  error = signal<string | null>(null);

  profile = signal<UserProfile | null>(null);
  stats = signal<UserStats>({
    eventsAttended: 0,
    eventsUpcoming: 0,
    clubsFollowed: 0,
    ratingsGiven: 0,
  });
  upcomingEvents = signal<ProfileEvent[]>([]);
  pastEvents = signal<ProfileEvent[]>([]);
  followedClubs = signal<FollowedClub[]>([]);
  userRatings = signal<UserRating[]>([]);

  // Edit mode
  isEditing = signal(false);

  async ngOnInit() {
    await this.loadDashboard();
  }

  async loadDashboard() {
    this.loading.set(true);
    this.error.set(null);

    try {
      const dashboard = await this.userService.getDashboard();

      if (dashboard) {
        this.profile.set(dashboard.profile);
        this.stats.set(dashboard.stats);
        this.upcomingEvents.set(dashboard.upcomingEvents);
        this.pastEvents.set(dashboard.recentEvents);
        this.followedClubs.set(dashboard.followedClubs);
      }

      // Also load ratings
      const ratings = await this.userService.getUserRatings();
      this.userRatings.set(ratings);
    } catch (err: any) {
      this.error.set(err?.message || 'Failed to load profile');
    } finally {
      this.loading.set(false);
    }
  }

  toggleEditMode() {
    this.isEditing.update(v => !v);
  }

  async onProfileUpdated() {
    this.isEditing.set(false);
    await this.loadDashboard();
  }

  async unfollowClub(clubId: number) {
    const success = await this.userService.unfollowClub(clubId);
    if (success) {
      this.followedClubs.update(clubs => clubs.filter(c => c.id !== clubId));
      this.stats.update(s => ({ ...s, clubsFollowed: s.clubsFollowed - 1 }));
    }
  }
}
