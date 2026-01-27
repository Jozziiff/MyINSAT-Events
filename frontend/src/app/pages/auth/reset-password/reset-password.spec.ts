import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResetPassword } from './reset-password';

describe('ResetPassword', () => {
  let component: ResetPassword;
  let fixture: ComponentFixture<ResetPassword>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResetPassword]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResetPassword);
    component = fixture.componentInstance;
    //The test file only contains a basic 'should create' test but lacks coverage for the component's main functionality: form validation, password matching, token handling, and the reset password flow. These behaviors introduced in reset-password.ts lines 36-83 should be tested.
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
