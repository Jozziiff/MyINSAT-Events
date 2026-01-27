import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthStateService } from '../../../services/auth/auth-state';

@Component({
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);

  readonly registerForm: FormGroup;
  readonly errorMessage = signal<string>('');
  readonly isLoading = this.authState.isLoading;

  constructor() {
    this.registerForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    }, {
      validators: this.passwordMatchValidator
    });
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set('');

    const { confirmPassword, ...registerData } = this.registerForm.value;

    try {
      await this.authState.register(registerData);
      this.router.navigate(['/']);
    } catch (error: any) {
      this.errorMessage.set(
        error.error?.message || 'Registration failed. Please try again.'
      );
    }
  }

  getErrorMessage(fieldName: string): string {
    const control = this.registerForm.get(fieldName);
    
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

  getFormError(): string {
    if (this.registerForm.errors?.['passwordMismatch'] && 
        this.registerForm.get('confirmPassword')?.touched) {
      return 'Passwords do not match';
    }
    return '';
  }

  private capitalize(str: string): string {
    return str.replace(/([A-Z])/g, ' $1').trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
