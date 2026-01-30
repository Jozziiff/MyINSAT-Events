import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
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
export class UserProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private userService = inject(UserService);
  private eventsService = inject(EventsService);

  loading = signal(true);
  error = signal<string | null>(null);
  profile = signal<PublicUserProfile | null>(null);
  userRatings = signal<PublicUserRating[]>([]);
  ratingsLoading = signal(false);
  showAllRatings = signal(false);

  // Filter and sort
  searchQuery = signal('');
  selectedFilter = signal<EventFilterType>('all');
  selectedSort = signal<EventSortType>('date-asc');
  showFilterDropdown = signal(false);
  showSortDropdown = signal(false);

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

  allEvents = computed(() => {
    const p = this.profile();
    if (!p) return [];
    return [...p.upcomingEvents, ...p.pastEvents];
  });

  filteredEvents = computed(() => {
    let filtered = this.allEvents();
    const query = this.searchQuery().toLowerCase();

    // Apply search
    if (query) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(query) ||
        event.clubName?.toLowerCase().includes(query)
      );
    }

    // Apply filter
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

    // Apply sort
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

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      await this.loadProfile(id);
    } else {
      this.error.set('User not found');
      this.loading.set(false);
    }
  }

  async loadProfile(userId: number) {
    this.loading.set(true);
    this.error.set(null);

    try {
      const [profile, ratings] = await Promise.all([
        this.userService.getPublicProfile(userId),
        this.loadUserRatings(userId)
      ]);

      if (profile) {
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
      } else {
        this.error.set('User not found');
      }
    } catch (err: any) {
      this.error.set(err?.message || 'Failed to load user profile');
    } finally {
      this.loading.set(false);
    }
  }

  async loadUserRatings(userId: number): Promise<void> {
    this.ratingsLoading.set(true);
    try {
      const response = await fetch(`http://localhost:3000/users/${userId}/ratings`);
      if (response.ok) {
        const data = await response.json();
        this.userRatings.set(data.map((r: any) => ({
          ...r,
          createdAt: new Date(r.createdAt)
        })));
      }
    } catch (err) {
      console.error('Failed to load ratings:', err);
    } finally {
      this.ratingsLoading.set(false);
    }
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
