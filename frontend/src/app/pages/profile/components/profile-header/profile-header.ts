import { Component, Input } from '@angular/core';
import { UserProfile } from '../../../../models/profile.models';

@Component({
  selector: 'app-profile-header',
  templateUrl: './profile-header.html',
  styleUrls: ['./profile-header.css'],
})
export class ProfileHeader {
  @Input() profile!: UserProfile;
}
