import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClubContact } from '../../../models/club.model';
import { FormInputComponent } from '../../shared/form-input/form-input';

interface ContactField {
  key: keyof ClubContact;
  label: string;
  type: 'email' | 'tel' | 'url';
  placeholder: string;
}

@Component({
  selector: 'app-contact-form-section',
  standalone: true,
  imports: [FormsModule, FormInputComponent],
  templateUrl: './contact-form-section.html',
  styleUrl: './contact-form-section.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactFormSectionComponent {
  @Input() contact: ClubContact = {};
  @Output() contactChange = new EventEmitter<ClubContact>();

  readonly contactFields: ContactField[] = [
    { key: 'email', label: 'Email', type: 'email', placeholder: 'club@example.com' },
    { key: 'phone', label: 'Phone', type: 'tel', placeholder: '+216 XX XXX XXX' },
    { key: 'website', label: 'Website', type: 'url', placeholder: 'https://yourclub.com' },
    { key: 'facebook', label: 'Facebook', type: 'url', placeholder: 'https://facebook.com/yourclub' },
    { key: 'instagram', label: 'Instagram', type: 'url', placeholder: 'https://instagram.com/yourclub' },
    { key: 'linkedin', label: 'LinkedIn', type: 'url', placeholder: 'https://linkedin.com/company/yourclub' }
  ];

  onFieldChange(key: keyof ClubContact, value: string): void {
    this.contact = { ...this.contact, [key]: value };
    this.contactChange.emit(this.contact);
  }
}
