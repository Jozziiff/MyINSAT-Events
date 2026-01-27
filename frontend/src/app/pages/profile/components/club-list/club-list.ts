import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FollowedClub } from '../../../../models/profile.models';

@Component({
  selector: 'app-club-list',
  templateUrl: './club-list.html',
  styleUrls: ['./club-list.css'],
  imports: [CommonModule, RouterModule],
})
export class ClubList {
  @Input() clubs: FollowedClub[] = [];
  @Input() showUnfollow = false;
  @Output() unfollowClub = new EventEmitter<number>();

  unfollowingId = signal<number | null>(null);

  onUnfollow(clubId: number, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.unfollowingId.set(clubId);
    this.unfollowClub.emit(clubId);
  }
}
