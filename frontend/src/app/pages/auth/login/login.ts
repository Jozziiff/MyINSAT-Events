import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthStateService } from '../../../services/auth/auth-state';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);

  readonly loginForm: FormGroup;
  readonly errorMessage = signal<string>('');
  readonly isLoading = this.authState.isLoading;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set('');

    try {
      await this.authState.login(this.loginForm.value);
      this.router.navigate(['/']);
    } catch (error: any) {
      this.errorMessage.set(
        error.error?.message || 'Login failed. Please check your credentials.'
      );
    }
  }

  getErrorMessage(fieldName: string): string {
    const control = this.loginForm.get(fieldName);
    
    if (!control?.touched || !control?.errors) {
      return '';
    }

    if (control.errors['required']) {
      return `${this.capitalize(fieldName)} is required`;
    }

    if (control.errors['email']) {
      return 'Please enter a valid email';
    }

    if (control.errors['minlength']) {
      return `${this.capitalize(fieldName)} must be at least ${control.errors['minlength'].requiredLength} characters`;
    }

    return '';
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
