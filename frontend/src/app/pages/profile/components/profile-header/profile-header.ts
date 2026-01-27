import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer } from '@angular/platform-browser';
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
  private sanitizer = inject(DomSanitizer);
  private http = inject(HttpClient);
  uploadingAvatar = signal(false);
  avatarUploadError: string | null = null;

  onAvatarClick(fileInput: HTMLInputElement) {
    if (this.isEditing) fileInput.click();
  }

  async onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      this.avatarUploadError = 'Please select a valid image file.';
      return;
    }
    this.avatarUploadError = null;
    this.uploadingAvatar.set(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      // Send the old avatar URL to backend for deletion
      if (this.profile.avatarUrl) {
        formData.append('oldAvatarUrl', this.profile.avatarUrl);
      }
      const data: any = await this.http.post('/upload/image', formData, { withCredentials: true }).toPromise();
      if (!data || !data.url) throw new Error('No URL returned');
      await this.userService.updateProfile({ avatarUrl: data.url });
      this.profile.avatarUrl = data.url;
      this.profileUpdated.emit();
    } catch (e) {
      this.avatarUploadError = 'Failed to upload image.';
    } finally {
      this.uploadingAvatar.set(false);
    }
  }

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

  phoneNumberError: string | null = null;

  validatePhoneNumber(): boolean {
    const value = this.editForm.phoneNumber;
    if (!value) {
      this.phoneNumberError = null;
      return true;
    }
    if (!/^[0-9]{8}$/.test(value)) {
      this.phoneNumberError = 'Le numéro doit contenir exactement 8 chiffres.';
      return false;
    }
    this.phoneNumberError = null;
    return true;
  }

  clearPhoneNumber() {
    this.editForm.phoneNumber = '';
    this.phoneNumberError = null;
  }

  async saveProfile() {
    if (!this.validatePhoneNumber()) {
      return;
    }
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
