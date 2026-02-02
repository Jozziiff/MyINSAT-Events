import { Component, signal, inject, ChangeDetectionStrategy, OnInit, DestroyRef, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { firstValueFrom, timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthApiService } from '../../../services/auth/auth-api';

/** Password validation regex patterns */
const PASSWORD_PATTERNS = {
  uppercase: /[A-Z]/,
  number: /[0-9]/,
  specialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
} as const;

/** Minimum password length requirement */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Validates password against all requirements
 * Single source of truth for password validation logic
 */
function validatePasswordRequirements(password: string) {
  return {
    hasMinLength: password.length >= MIN_PASSWORD_LENGTH,
    hasUppercase: PASSWORD_PATTERNS.uppercase.test(password),
    hasNumber: PASSWORD_PATTERNS.number.test(password),
    hasSpecialChar: PASSWORD_PATTERNS.specialChar.test(password),
  };
}

/**
 * Custom validator for password requirements
 */
function passwordValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  
  if (!value) {
    return null; // Let required validator handle empty values
  }

  const requirements = validatePasswordRequirements(value);
  const isValid = requirements.hasMinLength && requirements.hasUppercase && 
                  requirements.hasNumber && requirements.hasSpecialChar;

  return isValid ? null : { passwordRequirements: true };
}

/**
 * Cross-field validator for password matching
 */
function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('newPassword');
  const confirmPassword = control.get('confirmPassword');
  if (!password || !confirmPassword) return null;
  return password.value === confirmPassword.value ? null : { passwordMismatch: true };
}

@Component({ selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPassword implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly resetForm = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, passwordValidator]],
    confirmPassword: ['', [Validators.required]],
  }, {
    validators: passwordMatchValidator
  });

  readonly isLoading = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');
  private token = '';

  // Password validation signals
  private readonly passwordValue = signal('');
  private readonly confirmPasswordValue = signal('');
  readonly passwordTouched = signal(false);
  readonly confirmPasswordTouched = signal(false);

  // Computed validation states - derived from shared validation logic
  private readonly passwordRequirements = computed(() => validatePasswordRequirements(this.passwordValue()));
  
  readonly hasMinLength = computed(() => this.passwordRequirements().hasMinLength);
  readonly hasUppercase = computed(() => this.passwordRequirements().hasUppercase);
  readonly hasNumber = computed(() => this.passwordRequirements().hasNumber);
  readonly hasSpecialChar = computed(() => this.passwordRequirements().hasSpecialChar);
  
  readonly passwordsMatch = computed(() => {
    const password = this.passwordValue();
    const confirmPassword = this.confirmPasswordValue();
    return password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  });

  constructor() {
    this.setupFormSubscriptions();
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParams['token'] || '';
    
    if (!this.token) {
      this.errorMessage.set('Invalid or missing reset token');
    }
  }

  private setupFormSubscriptions(): void {
    this.resetForm.controls.newPassword.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => this.passwordValue.set(value));

    this.resetForm.controls.confirmPassword.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => this.confirmPasswordValue.set(value));
  }

  onPasswordBlur(): void {
    this.passwordTouched.set(true);
  }

  onConfirmPasswordBlur(): void {
    this.confirmPasswordTouched.set(true);
  }

  async onSubmit(): Promise<void> {
    this.passwordTouched.set(true);
    this.confirmPasswordTouched.set(true);

    if (this.resetForm.invalid || !this.token) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      await firstValueFrom(this.authApi.resetPassword({
        token: this.token,
        newPassword: this.resetForm.getRawValue().newPassword
      }));
      
      this.successMessage.set('Password reset successfully! Redirecting to login...');
      
      timer(2000)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.router.navigate(['/login']);
        });
    } catch (error: any) {
      this.errorMessage.set(
        error.error?.message || 'Failed to reset password. The link may be expired.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
