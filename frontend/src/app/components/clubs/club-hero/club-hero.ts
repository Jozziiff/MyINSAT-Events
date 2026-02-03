import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-club-hero',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './club-hero.html',
  styleUrl: './club-hero.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClubHeroComponent {
  // Required inputs
  @Input() name = '';
  @Input() tagline = '';
  
  // Optional inputs
  @Input() logoUrl = '';
  @Input() coverUrl = '';
  @Input() foundedYear: number | null = null;
  @Input() isPreview = false;
  
  // For detail page
  @Input() showBackButton = false;
  @Input() showEditButton = false;
  @Input() editLink: (string | number)[] = [];
  @Input() showFollowButton = false;
  @Input() isFollowing = false;
  @Input() isLoggedIn = false;
  @Input() followLoading = false;
  @Input() followerCount = 0;
  @Input() showFollowerCount = false;
  
  // Events
  @Output() followClick = new EventEmitter<void>();
  @Output() followerCountClick = new EventEmitter<void>();

  get hasLogo(): boolean {
    return !!this.logoUrl;
  }

  get hasCover(): boolean {
    return !!this.coverUrl;
  }

  get displayName(): string {
    return this.name || 'Your Club Name';
  }

  get displayTagline(): string {
    return this.tagline || 'Your tagline will appear here';
  }

  onFollowClick(): void {
    this.followClick.emit();
  }

  onFollowerCountClick(): void {
    this.followerCountClick.emit();
  }
}
