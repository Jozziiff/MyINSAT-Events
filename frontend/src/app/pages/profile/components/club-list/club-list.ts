import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FollowedClub } from '../../../../models/profile.models';

@Component({
  selector: 'app-club-list',
  templateUrl: './club-list.html',
  styleUrls: ['./club-list.css'],
  imports: [CommonModule],
})
export class ClubList {
  @Input() clubs: FollowedClub[] = [];
}
