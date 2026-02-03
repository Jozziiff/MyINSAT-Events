import { Component, Input, Output, EventEmitter } from '@angular/core';
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
  template: `
    <section class="form-section">
      <h2>Contact Information <span class="optional-badge">Optional</span></h2>

      <div class="form-row">
        @for (field of contactFields.slice(0, 2); track field.key) {
          <app-form-input
            [label]="field.label"
            [inputId]="field.key"
            [type]="field.type"
            [placeholder]="field.placeholder"
            [ngModel]="contact[field.key] || ''"
            (ngModelChange)="onFieldChange(field.key, $event)">
          </app-form-input>
        }
      </div>

      <div class="form-row">
        @for (field of contactFields.slice(2, 4); track field.key) {
          <app-form-input
            [label]="field.label"
            [inputId]="field.key"
            [type]="field.type"
            [placeholder]="field.placeholder"
            [ngModel]="contact[field.key] || ''"
            (ngModelChange)="onFieldChange(field.key, $event)">
          </app-form-input>
        }
      </div>

      <div class="form-row">
        @for (field of contactFields.slice(4, 6); track field.key) {
          <app-form-input
            [label]="field.label"
            [inputId]="field.key"
            [type]="field.type"
            [placeholder]="field.placeholder"
            [ngModel]="contact[field.key] || ''"
            (ngModelChange)="onFieldChange(field.key, $event)">
          </app-form-input>
        }
      </div>
    </section>
  `,
  styles: [`
    .form-section {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      padding: 1.5rem;
      margin-bottom: 1.5rem;

      h2 {
        font-size: 1.1rem;
        color: var(--color-text-primary);
        margin-bottom: 1.25rem;
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
    }

    .optional-badge {
      font-size: 0.65rem;
      padding: 0.2rem 0.4rem;
      background: rgba(99, 102, 241, 0.1);
      color: var(--color-primary-light);
      border-radius: var(--radius-sm);
      font-weight: 600;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    @media (max-width: 600px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ContactFormSectionComponent {
  @Input() contact: ClubContact = {};
  @Output() contactChange = new EventEmitter<ClubContact>();

  contactFields: ContactField[] = [
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
