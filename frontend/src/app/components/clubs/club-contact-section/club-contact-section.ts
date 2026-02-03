import { Component, Input } from '@angular/core';
import { ClubContact } from '../../../models/club.model';

interface ContactLink {
  key: string;
  label: string;
  value: string;
  href: string;
}

@Component({
  selector: 'app-club-contact-section',
  standalone: true,
  templateUrl: './club-contact-section.html',
  styleUrl: './club-contact-section.css'
})
export class ClubContactSectionComponent {
  @Input() contact: ClubContact | null = null;
  @Input() isPreview = false;

  get hasContact(): boolean {
    if (!this.contact) return false;
    return !!(
      this.contact.email ||
      this.contact.phone ||
      this.contact.website ||
      this.contact.facebook ||
      this.contact.instagram ||
      this.contact.linkedin
    );
  }

  get contactLinks(): ContactLink[] {
    if (!this.contact) return [];
    
    const links: ContactLink[] = [];

    if (this.contact.email) {
      links.push({
        key: 'email',
        label: 'Email',
        value: this.contact.email,
        href: `mailto:${this.contact.email}`
      });
    }

    if (this.contact.phone) {
      links.push({
        key: 'phone',
        label: 'Phone',
        value: this.contact.phone,
        href: `tel:${this.contact.phone}`
      });
    }

    if (this.contact.website) {
      links.push({
        key: 'website',
        label: 'Website',
        value: 'Website',
        href: this.contact.website
      });
    }

    if (this.contact.facebook) {
      links.push({
        key: 'facebook',
        label: 'Facebook',
        value: 'Facebook',
        href: this.contact.facebook
      });
    }

    if (this.contact.instagram) {
      links.push({
        key: 'instagram',
        label: 'Instagram',
        value: 'Instagram',
        href: this.contact.instagram
      });
    }

    if (this.contact.linkedin) {
      links.push({
        key: 'linkedin',
        label: 'LinkedIn',
        value: 'LinkedIn',
        href: this.contact.linkedin
      });
    }

    return links;
  }
}
