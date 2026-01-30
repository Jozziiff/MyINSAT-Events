import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ClubsService } from '../../services/clubs.service';
import { ClubSummary } from '../../models/club.model';
import { TokenService } from '../../services/auth/token';
import { fadeSlideIn } from '../../animations';

type SortType = 'followers-desc' | 'followers-asc' | 'events' | 'oldest';

interface ClubWithFollow extends ClubSummary {
  isFollowing?: boolean;
  followLoading?: boolean;
}

@Component({
  selector: 'app-clubs',
  imports: [RouterLink, FormsModule],
  templateUrl: './clubs.html',
  styleUrl: './clubs.css',
  animations: [fadeSlideIn]
})
export class ClubsComponent implements OnInit {
  private clubsService = inject(ClubsService);
  private tokenService = inject(TokenService);
  private router = inject(Router);

  clubs = signal<ClubWithFollow[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  searchQuery = signal('');
  selectedSort = signal<SortType>('followers-desc');
  showSortDropdown = signal(false);

  isLoggedIn = computed(() => !!this.tokenService.getAccessToken());

  sortOptions = [
    { value: 'followers-desc' as SortType, label: 'Most Followers', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>' },
    { value: 'followers-asc' as SortType, label: 'Least Followers', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="23" y1="11" x2="17" y2="11"></line></svg>' },
    { value: 'events' as SortType, label: 'Most Events', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>' },
    { value: 'oldest' as SortType, label: 'Oldest Founded', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>' }
  ];

  filteredClubs = computed(() => {
    let filtered = this.clubs();
    const query = this.searchQuery().toLowerCase();

    // Apply search - prioritize name matches
    if (query) {
      filtered = filtered.filter(club => {
        const name = club.name.toLowerCase();
        // Only search in name for more precise results
        return name.includes(query);
      });
    }

    // Apply sort
    const sorted = [...filtered];
    switch (this.selectedSort()) {
      case 'followers-desc':
        sorted.sort((a, b) => (b.followerCount || 0) - (a.followerCount || 0));
        break;
      case 'followers-asc':
        sorted.sort((a, b) => (a.followerCount || 0) - (b.followerCount || 0));
        break;
      case 'events':
        sorted.sort((a, b) => (b.eventsCount || 0) - (a.eventsCount || 0));
        break;
      case 'oldest':
        // Sort by foundedYear (oldest first), clubs without foundedYear go to the end
        sorted.sort((a, b) => {
          const yearA = a.foundedYear;
          const yearB = b.foundedYear;
          // If both have foundedYear, compare them
          if (yearA && yearB) return yearA - yearB;
          // If only a has foundedYear, a comes first
          if (yearA && !yearB) return -1;
          // If only b has foundedYear, b comes first
          if (!yearA && yearB) return 1;
          // If neither has foundedYear, sort by createdAt
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        break;
    }

    return sorted;
  });

  async ngOnInit() {
    await this.loadClubs();
  }

  applySort(sort: SortType) {
    this.selectedSort.set(sort);
    this.showSortDropdown.set(false);
  }

  get currentSortLabel(): string {
    return this.sortOptions.find(opt => opt.value === this.selectedSort())?.label || 'Sort';
  }

  private async loadClubs() {
    this.loading.set(true);
    const clubs = await this.clubsService.getAllClubs();

    if (this.clubsService.error()) {
      this.error.set(this.clubsService.error());
    } else {
      // Initialize with follow state
      const clubsWithFollow: ClubWithFollow[] = clubs.map(c => ({
        ...c,
        isFollowing: false,
        followLoading: false,
      }));

      // Check follow status for logged in users
      if (this.isLoggedIn()) {
        await Promise.all(
          clubsWithFollow.map(async (club) => {
            club.isFollowing = await this.clubsService.isFollowing(club.id);
          })
        );
      }

      this.clubs.set(clubsWithFollow);
    }

    this.loading.set(false);
  }

  async toggleFollow(club: ClubWithFollow, event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.isLoggedIn()) return;

    // Update loading state
    this.clubs.update(clubs =>
      clubs.map(c => c.id === club.id ? { ...c, followLoading: true } : c)
    );

    if (club.isFollowing) {
      const success = await this.clubsService.unfollowClub(club.id);
      if (success) {
        this.clubs.update(clubs =>
          clubs.map(c => c.id === club.id ? { ...c, isFollowing: false, followLoading: false } : c)
        );
      } else {
        this.clubs.update(clubs =>
          clubs.map(c => c.id === club.id ? { ...c, followLoading: false } : c)
        );
      }
    } else {
      const success = await this.clubsService.followClub(club.id);
      if (success) {
        this.clubs.update(clubs =>
          clubs.map(c => c.id === club.id ? { ...c, isFollowing: true, followLoading: false } : c)
        );
      } else {
        this.clubs.update(clubs =>
          clubs.map(c => c.id === club.id ? { ...c, followLoading: false } : c)
        );
      }
    }
  }

  navigateToClub(clubId: number) {
    this.router.navigate(['/clubs', clubId]);
  }

  formatFoundedDate(date: Date | string): string {
    if (!date) return 'N/A';
    const parsedDate = typeof date === 'string' ? new Date(date) : date;
    const year = parsedDate.getFullYear();
    return isNaN(year) ? 'N/A' : year.toString();
  }
}
