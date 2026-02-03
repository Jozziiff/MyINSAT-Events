import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, takeUntil, finalize } from 'rxjs';
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
} from '../../../models/profile.models';
import { ManagedClub, ClubStatus } from '../../../models/club.model';
import { RegistrationStatus } from '../../../models/event.model';
import { trigger, transition, style, animate, stagger, query } from '@angular/animations';
import { isEventLive } from '../../../utils/time.utils';

type EventFilterType = 'all' | 'confirmed' | 'pending' | 'interested' | 'rejected' | 'live' | 'attended' | 'past';
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
export class ProfilePage implements OnInit, OnDestroy {
  private readonly userService = inject(UserService);
  private readonly clubsService = inject(ClubsService);
  private readonly authState = inject(AuthStateService);
  private readonly destroy$ = new Subject<void>();

  // Read-only constants for template
  readonly userRole = this.authState.userRole;
  readonly Role = Role;
  readonly ClubStatus = ClubStatus;

  // UI state signals - for local component state and user interactions
  loading = signal(true); // Loading state for async operations
  error = signal<string | null>(null); // Error message display
  showJoinClubPopup = signal(false); // Modal visibility control
  isEditing = signal(false); // Profile edit mode toggle

  // Data signals - for storing fetched data from services
  profile = signal<UserProfile | null>(null); // User profile information
  stats = signal<UserStats>({ // User statistics
    eventsAttended: 0,
    eventsUpcoming: 0,
    clubsFollowed: 0,
    ratingsGiven: 0,
  });
  upcomingEvents = signal<ProfileEvent[]>([]); // Future events user registered for
  followedClubs = signal<FollowedClub[]>([]); // Clubs user follows
  userRatings = signal<UserRating[]>([]); // Ratings given by user
  managedClubs = signal<ManagedClub[]>([]); // Clubs managed by user
  allRegisteredEvents = signal<ProfileEvent[]>([]); // All events for filtering

  // Filter UI state - for event filtering and sorting
  searchQuery = signal(''); // Search input value
  selectedFilter = signal<EventFilterType>('all'); // Current filter selection
  selectedSort = signal<EventSortType>('date-asc'); // Current sort selection
  showFilterDropdown = signal(false); // Filter dropdown visibility
  showSortDropdown = signal(false); // Sort dropdown visibility

  // Static configuration - filter and sort options for UI
  filterOptions = [
    { value: 'all' as EventFilterType, label: 'All Events'},
    { value: 'live' as EventFilterType, label: 'Live Now'},
    { value: 'confirmed' as EventFilterType, label: 'Confirmed'},
    { value: 'pending' as EventFilterType, label: 'Pending Payment'},
    { value: 'interested' as EventFilterType, label: 'Interested'},
    { value: 'attended' as EventFilterType, label: 'Attended'},
    { value: 'past' as EventFilterType, label: 'Past Events'},
    { value: 'rejected' as EventFilterType, label: 'Rejected'}
  ];

  sortOptions = [
    { value: 'date-asc' as EventSortType, label: 'Closest First', icon: '📅↑' },
    { value: 'date-desc' as EventSortType, label: 'Furthest First', icon: '📅↓' }
  ];

  // Computed signal - automatically recalculates when dependencies change
  // Used here because filtering/sorting is derived UI state based on user input
  filteredEvents = computed(() => {
    let filtered = this.allRegisteredEvents();
    const query = this.searchQuery().toLowerCase();

    // Apply search filter
    if (query) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(query) ||
        event.clubName?.toLowerCase().includes(query)
      );
    }

    // Apply status/type filter
    switch (this.selectedFilter()) {
      case 'live':
        filtered = filtered.filter(e => isEventLive(e.startTime, e.endTime));
        break;
      case 'confirmed':
        filtered = filtered.filter(e => e.registrationStatus === RegistrationStatus.CONFIRMED);
        break;
      case 'pending':
        filtered = filtered.filter(e => e.registrationStatus === RegistrationStatus.PENDING_PAYMENT);
        break;
      case 'interested':
        filtered = filtered.filter(e => e.registrationStatus === RegistrationStatus.INTERESTED);
        break;
      case 'attended':
        filtered = filtered.filter(e => e.registrationStatus === RegistrationStatus.ATTENDED);
        break;
      case 'past':
        const now = new Date();
        filtered = filtered.filter(e => new Date(e.endTime) < now);
        break;
      case 'rejected':
        filtered = filtered.filter(e => e.registrationStatus === RegistrationStatus.REJECTED);
        break;
    }

    // Apply sorting
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      const dateA = new Date(a.startTime).getTime();
      const dateB = new Date(b.startTime).getTime();

      return this.selectedSort() === 'date-asc' ? dateA - dateB : dateB - dateA;
    });

    return sorted;
  });

  ngOnInit() {
    this.loadDashboard();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads all dashboard data using observables from services
   * Services handle async operations, component manages UI state
   */
  loadDashboard() {
    this.loading.set(true);
    this.error.set(null);

    // Use forkJoin to combine multiple observables - parallel data loading
    forkJoin({
      dashboard: this.userService.getDashboard(),
      ratings: this.userService.getUserRatings(),
      managed: this.clubsService.getManagedClubs()
    }).pipe(
      takeUntil(this.destroy$), // Cleanup subscription on component destroy
      finalize(() => this.loading.set(false)) // Always stop loading, regardless of success/error
    ).subscribe({
      next: ({ dashboard, ratings, managed }) => {
        this.updateDashboardData(dashboard, ratings, managed);
      },
      error: (err) => {
        this.error.set(err?.message || 'Failed to load profile');
      }
    });
  }

  /**
   * Updates component state signals with fetched data
   * Pure function that transforms service data into UI state
   */
  private updateDashboardData(dashboard: UserDashboard, ratings: UserRating[], managed: any[]) {
    if (dashboard) {
      this.profile.set(dashboard.profile);
      this.upcomingEvents.set(dashboard.upcomingEvents);
      this.followedClubs.set(dashboard.followedClubs);
      this.allRegisteredEvents.set([...dashboard.upcomingEvents, ...dashboard.recentEvents]);

      // Calculate stats excluding live events from upcoming count
      const upcomingCount = dashboard.upcomingEvents.filter(e =>
        !isEventLive(e.startTime, e.endTime)
      ).length;

      this.stats.set({
        ...dashboard.stats,
        eventsUpcoming: upcomingCount
      });
    }

    this.userRatings.set(ratings);
    this.managedClubs.set(managed as ManagedClub[]);
  }

  // UI interaction methods - handle user actions and update signals

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

  openJoinClubPopup() {
    this.showJoinClubPopup.set(true);
  }

  closeJoinClubPopup() {
    this.showJoinClubPopup.set(false);
  }

  // Computed getters for template display - derive UI labels from current state
  get currentFilterLabel(): string {
    return this.filterOptions.find(opt => opt.value === this.selectedFilter())?.label || 'Filter';
  }

  get currentSortLabel(): string {
    return this.sortOptions.find(opt => opt.value === this.selectedSort())?.label || 'Sort';
  }

  // Async actions that trigger service calls and update UI state

  onProfileUpdated() {
    this.isEditing.set(false);
    this.loadDashboard(); // Reload fresh data after profile update
  }

  unfollowClub(clubId: number) {
    // Use observable pattern for async operation
    this.userService.unfollowClub(clubId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (success) => {
        if (success) {
          // Optimistic UI update - update local state immediately
          this.followedClubs.update(clubs => clubs.filter(c => c.id !== clubId));
          this.stats.update(s => ({ ...s, clubsFollowed: Math.max(0, s.clubsFollowed - 1) }));
        }
      },
      error: (err) => {
        // Handle error silently or show notification
        console.error('Failed to unfollow club:', err);
      }
    });
  }
}
