import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProfileHeader } from '../components/profile-header/profile-header';
import { EventSection } from '../components/event-section/event-section';
import { ClubList } from '../components/club-list/club-list';
import { StatsCard } from '../components/stats-card/stats-card';
import { RatingsSection } from '../components/ratings-section/ratings-section';
import { JoinClubPopup } from '../components/join-club-popup/join-club-popup';
import { UserService } from '../../../services/user.service';
import { ClubsService } from '../../../services/clubs.service';
import { AuthStateService } from '../../../services/auth/auth-state';
import { Role } from '../../../models/auth.models';
import {
  UserProfile,
  UserDashboard,
  ProfileEvent,
  FollowedClub,
  UserRating,
  UserStats,
  UserRole,
} from '../../../models/profile.models';
import { ManagedClub, ClubStatus } from '../../../models/club.model';
import { RegistrationStatus } from '../../../models/event.model';
import { trigger, transition, style, animate, stagger, query } from '@angular/animations';

type EventFilterType = 'all' | 'confirmed' | 'pending' | 'interested';
type EventSortType = 'date-asc' | 'date-desc';

@Component({
  selector: 'app-profile-page',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ProfileHeader,
    EventSection,
    ClubList,
    StatsCard,
    RatingsSection,
    JoinClubPopup,
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
  private clubsService = inject(ClubsService);
  private authState = inject(AuthStateService);

  readonly userRole = this.authState.userRole;
  readonly Role = Role;
  readonly ClubStatus = ClubStatus;

  loading = signal(true);
  error = signal<string | null>(null);
  showJoinClubPopup = signal(false);

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
  managedClubs = signal<ManagedClub[]>([]);

  // All registered events (including past)
  allRegisteredEvents = signal<ProfileEvent[]>([]);

  // Filter and sort for upcoming events
  searchQuery = signal('');
  selectedFilter = signal<EventFilterType>('all');
  selectedSort = signal<EventSortType>('date-asc');
  showFilterDropdown = signal(false);
  showSortDropdown = signal(false);

  filterOptions = [
    { value: 'all' as EventFilterType, label: 'All Events', icon: '📋' },
    { value: 'confirmed' as EventFilterType, label: 'Confirmed', icon: '✓' },
    { value: 'pending' as EventFilterType, label: 'Pending Payment', icon: '⏳' },
    { value: 'interested' as EventFilterType, label: 'Interested', icon: '❤️' }
  ];

  sortOptions = [
    { value: 'date-asc' as EventSortType, label: 'Closest First', icon: '📅↑' },
    { value: 'date-desc' as EventSortType, label: 'Furthest First', icon: '📅↓' }
  ];

  filteredEvents = computed(() => {
    let filtered = this.allRegisteredEvents();
    const query = this.searchQuery().toLowerCase();

    // Apply search
    if (query) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(query) ||
        event.clubName?.toLowerCase().includes(query)
      );
    }

    // Apply filter by registration status
    switch (this.selectedFilter()) {
      case 'confirmed':
        filtered = filtered.filter(e => e.registrationStatus === RegistrationStatus.CONFIRMED);
        break;
      case 'pending':
        filtered = filtered.filter(e => e.registrationStatus === RegistrationStatus.PENDING_PAYMENT);
        break;
      case 'interested':
        filtered = filtered.filter(e => e.registrationStatus === RegistrationStatus.INTERESTED);
        break;
    }

    // Apply sort
    const sorted = [...filtered];
    const now = new Date().getTime();

    sorted.sort((a, b) => {
      const dateA = new Date(a.startTime).getTime();
      const dateB = new Date(b.startTime).getTime();

      if (this.selectedSort() === 'date-asc') {
        return dateA - dateB; // Closest first
      } else {
        return dateB - dateA; // Furthest first
      }
    });

    return sorted;
  });

  // Edit mode
  isEditing = signal(false);

  async ngOnInit() {
    await this.loadDashboard();
  }

  async loadDashboard() {
    this.loading.set(true);
    this.error.set(null);

    try {
      const [dashboard, ratings, managed] = await Promise.all([
        this.userService.getDashboard(),
        this.userService.getUserRatings(),
        this.clubsService.getManagedClubs(),
      ]);

      if (dashboard) {
        this.profile.set(dashboard.profile);

        // Combine upcoming and recent events to show all registered events
        const allEvents = [...dashboard.upcomingEvents, ...dashboard.recentEvents];
        this.allRegisteredEvents.set(allEvents);

        // Update stats - count all events with any registration status
        const upcomingCount = allEvents.filter(e => {
          const eventDate = new Date(e.startTime).getTime();
          const now = new Date().getTime();
          return eventDate >= now;
        }).length;

        this.stats.set({
          ...dashboard.stats,
          eventsUpcoming: upcomingCount
        });

        this.upcomingEvents.set(dashboard.upcomingEvents);
        this.pastEvents.set(dashboard.recentEvents);
        this.followedClubs.set(dashboard.followedClubs);
      }

      this.userRatings.set(ratings);
      this.managedClubs.set(managed as ManagedClub[]);
    } catch (err: any) {
      this.error.set(err?.message || 'Failed to load profile');
    } finally {
      this.loading.set(false);
    }
  }

  toggleEditMode() {
    this.isEditing.update(v => !v);
  }

  applyFilter(filter: EventFilterType) {
    this.selectedFilter.set(filter);
    this.showFilterDropdown.set(false);
  }

  applySort(sort: EventSortType) {
    this.selectedSort.set(sort);
    this.showSortDropdown.set(false);
  }

  get currentFilterLabel(): string {
    return this.filterOptions.find(opt => opt.value === this.selectedFilter())?.label || 'Filter';
  }

  get currentSortLabel(): string {
    return this.sortOptions.find(opt => opt.value === this.selectedSort())?.label || 'Sort';
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

  openJoinClubPopup() {
    this.showJoinClubPopup.set(true);
  }

  closeJoinClubPopup() {
    this.showJoinClubPopup.set(false);
  }
}
