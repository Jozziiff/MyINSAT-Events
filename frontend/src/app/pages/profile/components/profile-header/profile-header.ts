import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserProfile, UpdateProfileRequest } from '../../../../models/profile.models';
import { UserService } from '../../../../services/user.service';

@Component({
  selector: 'app-profile-header',
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-header.html',
  styleUrls: ['./profile-header.css'],
})
export class ProfileHeader {
  @Input() profile!: UserProfile;
  @Input() isEditing = false;
  @Output() editToggle = new EventEmitter<void>();
  @Output() profileUpdated = new EventEmitter<void>();

  private userService = inject(UserService);

  saving = signal(false);
  
  // Edit form fields
  editForm = {
    fullName: '',
    bio: '',
    studentYear: '',
    phoneNumber: '',
  };

  ngOnChanges() {
    if (this.profile && this.isEditing) {
      this.editForm = {
        fullName: this.profile.fullName || '',
        bio: this.profile.bio || '',
        studentYear: this.profile.studentYear || '',
        phoneNumber: this.profile.phoneNumber || '',
      };
    }
  }

  onEditClick() {
    this.editForm = {
      fullName: this.profile.fullName || '',
      bio: this.profile.bio || '',
      studentYear: this.profile.studentYear || '',
      phoneNumber: this.profile.phoneNumber || '',
    };
    this.editToggle.emit();
  }

  async saveProfile() {
    this.saving.set(true);
    try {
      const updates: UpdateProfileRequest = {};
      if (this.editForm.fullName !== this.profile.fullName) {
        updates.fullName = this.editForm.fullName;
      }
      if (this.editForm.bio !== (this.profile.bio || '')) {
        updates.bio = this.editForm.bio;
      }
      if (this.editForm.studentYear !== (this.profile.studentYear || '')) {
        updates.studentYear = this.editForm.studentYear;
      }
      if (this.editForm.phoneNumber !== (this.profile.phoneNumber || '')) {
        updates.phoneNumber = this.editForm.phoneNumber;
      }

      if (Object.keys(updates).length > 0) {
        await this.userService.updateProfile(updates);
      }
      this.profileUpdated.emit();
    } finally {
      this.saving.set(false);
    }
  }

  cancelEdit() {
    this.editToggle.emit();
  }
}
