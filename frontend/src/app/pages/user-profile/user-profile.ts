import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, forkJoin, takeUntil, finalize } from 'rxjs';
import { UserService } from '../../services/user.service';
import { EventsService } from '../../services/events.service';
import { fadeSlideIn } from '../../animations';
import { trigger, transition, style, animate, stagger, query } from '@angular/animations';
import { RegistrationStatus, EventRating } from '../../models/event.model';
import { isEventLive, getTimeUntilEvent, getTimeUntilEventEnds, formatCountdown, formatRemainingTime, TimeUntil } from '../../utils/time.utils';

export interface PublicUserProfile {
  id: number;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  studentYear: string | null;
  createdAt: Date;
  followedClubs: { id: number; name: string; logoUrl: string | null; shortDescription: string }[];
  managedClubs: { id: number; name: string; logoUrl: string | null; shortDescription: string }[];
  upcomingEvents: { id: number; title: string; photoUrl: string | null; startTime: Date; endTime: Date; clubName: string; status: string; registrationStatus: string }[];
  pastEvents: { id: number; title: string; photoUrl: string | null; startTime: Date; endTime: Date; clubName: string; status: string; registrationStatus: string }[];
}

export interface PublicUserRating {
  id: number;
  eventId: number;
  eventTitle: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
}

type EventFilterType = 'all' | 'confirmed' | 'pending' | 'interested' | 'rejected' | 'live' | 'attended' | 'past';
type EventSortType = 'date-asc' | 'date-desc';

@Component({
  selector: 'app-user-profile',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './user-profile.html',
  styleUrls: ['./user-profile.css'],
  animations: [
    fadeSlideIn,
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
export class UserProfileComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);
  private readonly eventsService = inject(EventsService);
  private readonly destroy$ = new Subject<void>();

  // UI state signals - for local component state and user interactions
  loading = signal(true); // Loading state for async operations
  error = signal<string | null>(null); // Error message display
  ratingsLoading = signal(false); // Loading state specifically for ratings
  showAllRatings = signal(false); // Toggle for showing all vs limited ratings

  // Data signals - for storing fetched data from services
  profile = signal<PublicUserProfile | null>(null); // User profile data
  userRatings = signal<PublicUserRating[]>([]); // User's public ratings

  // Filter UI state - for event filtering and sorting
  searchQuery = signal(''); // Search input value
  selectedFilter = signal<EventFilterType>('all'); // Current filter selection
  selectedSort = signal<EventSortType>('date-asc'); // Current sort selection
  showFilterDropdown = signal(false); // Filter dropdown visibility
  showSortDropdown = signal(false); // Sort dropdown visibility

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

  // Computed signals - automatically recalculate when dependencies change
  // Used for derived UI state that depends on other signals

  allEvents = computed(() => {
    const p = this.profile();
    if (!p) return [];
    return [...p.upcomingEvents, ...p.pastEvents];
  });

  filteredEvents = computed(() => {
    let filtered = this.allEvents();
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

  displayedRatings = computed(() => {
    const ratings = this.userRatings();
    return this.showAllRatings() ? ratings : ratings.slice(0, 3);
  });

  stats = computed(() => {
    const p = this.profile();
    if (!p) return { eventsAttended: 0, eventsUpcoming: 0, clubsFollowed: 0, ratingsGiven: 0 };
    const now = new Date();
    return {
      eventsAttended: p.pastEvents.filter(e => e.registrationStatus === RegistrationStatus.ATTENDED).length,
      eventsUpcoming: p.upcomingEvents.filter(e => new Date(e.startTime) > now && !isEventLive(e.startTime, e.endTime)).length,
      clubsFollowed: p.followedClubs.length,
      ratingsGiven: this.userRatings().length
    };
  });

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadProfile(id);
    } else {
      this.error.set('User not found');
      this.loading.set(false);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads user profile and ratings using observables from services
   * Services handle HTTP operations, component manages UI state
   */
  private loadProfile(userId: number) {
    this.loading.set(true);
    this.error.set(null);

    // Use forkJoin to combine multiple observables - parallel data loading
    forkJoin({
      profile: this.userService.getPublicProfile(userId),
      ratings: this.userService.getPublicUserRatings(userId)
    }).pipe(
      takeUntil(this.destroy$), // Cleanup subscription on component destroy
      finalize(() => this.loading.set(false)) // Always stop loading, regardless of success/error
    ).subscribe({
      next: ({ profile, ratings }) => {
        // Transform profile data to match component interface
        this.profile.set({
          ...profile,
          upcomingEvents: profile.upcomingEvents.map((e: any) => ({
            ...e,
            endTime: e.endTime || e.startTime,
            registrationStatus: e.status
          })),
          pastEvents: profile.pastEvents.map((e: any) => ({
            ...e,
            endTime: e.endTime || e.startTime,
            registrationStatus: e.status
          }))
        });

        // Set ratings data
        this.userRatings.set(ratings as PublicUserRating[]);
      },
      error: (err) => {
        this.error.set(err?.message || 'Failed to load user profile');
      }
    });
  }

  // UI interaction methods - handle user actions and update signals

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

  toggleShowAllRatings() {
    this.showAllRatings.set(!this.showAllRatings());
  }

  goBack() {
    window.history.back();
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'INTERESTED': 'Interested',
      'CONFIRMED': 'Going',
      'PENDING_PAYMENT': 'Pending Payment',
      'ATTENDED': 'Attended',
      'CANCELLED': 'Cancelled',
      'REJECTED': 'Rejected',
      'NO_SHOW': 'No Show'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'INTERESTED': 'status-interested',
      'CONFIRMED': 'status-confirmed',
      'PENDING_PAYMENT': 'status-pending',
      'ATTENDED': 'status-attended',
      'CANCELLED': 'status-cancelled',
      'REJECTED': 'status-rejected',
      'NO_SHOW': 'status-no-show'
    };
    return classes[status] || '';
  }

  isEventLive(startTime: Date, endTime: Date): boolean {
    return isEventLive(startTime, endTime);
  }

  isEventPast(endTime: Date): boolean {
    return new Date(endTime) < new Date();
  }

  isEventUpcoming(startTime: Date): boolean {
    return new Date(startTime) > new Date();
  }

  getTimeUntil(startTime: Date): TimeUntil | null {
    return getTimeUntilEvent(startTime);
  }

  getTimeUntilEnds(endTime: Date): TimeUntil | null {
    return getTimeUntilEventEnds(endTime);
  }

  formatCountdown(timeUntil: TimeUntil | null): string {
    return formatCountdown(timeUntil);
  }

  formatRemainingTime(timeUntil: TimeUntil | null): string {
    return formatRemainingTime(timeUntil);
  }
}
