import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class MailService implements OnModuleInit {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.createTransporter();
  }

  private async createTransporter() {


   

      
      try {
        const testAccount = await nodemailer.createTestAccount();
        
        this.transporter = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });

        this.logger.log('✅ Ethereal test account created');
        this.logger.log(`📧 Ethereal User: ${testAccount.user}`);
        this.logger.log(`🔑 Ethereal Pass: ${testAccount.pass}`);
        this.logger.log('🌐 View sent emails at: https://ethereal.email/messages');
      } catch (error) {
        this.logger.error('Failed to create Ethereal test account:', error);
        throw error;
      }
    

    // Verify transporter
    try {
      await this.transporter.verify();
      this.logger.log('✅ Mail transporter is ready');
    } catch (error) {
      this.logger.error('Mail transporter verification failed:', error);
    }
  }

  async sendMail(options: MailOptions): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: this.configService.get<string>('MAIL_FROM', '"MyINSAT Events" <noreply@myinsatevents.tn>'),
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      this.logger.log(`📧 Email sent to ${options.to}: ${info.messageId}`);

      // If using Ethereal, log the preview URL
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        this.logger.log(`📨 Preview URL: ${previewUrl}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      throw error;
    }
  }

  async sendEmailVerification(to: string, token: string): Promise<void> {
    const verificationUrl = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:4200')}/verify-email?token=${token}`;

    await this.sendMail({
      to,
      subject: 'Verify your email address - MyINSAT Events',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
              .button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to MyINSAT Events! 🎉</h1>
              </div>
              <div class="content">
                <h2>Verify Your Email Address</h2>
                <p>Thank you for registering with MyINSAT Events. To complete your registration, please verify your email address by clicking the button below:</p>
                <div style="text-align: center;">
                  <a href="${verificationUrl}" class="button">Verify Email</a>
                </div>
                <p>Or copy and paste this link in your browser:</p>
                <p style="word-break: break-all; color: #4F46E5;">${verificationUrl}</p>
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                  <strong>Note:</strong> This link will expire in 24 hours. If you didn't create an account with MyINSAT Events, please ignore this email.
                </p>
              </div>
              <div class="footer">
                <p>&copy; 2026 MyINSAT Events. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `Welcome to MyINSAT Events!\n\nPlease verify your email address by clicking the following link:\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't create an account, please ignore this email.`,
    });
  }

  async sendPasswordReset(to: string, token: string): Promise<void> {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:4200')}/reset-password?token=${token}`;

    await this.sendMail({
      to,
      subject: 'Reset your password - MyINSAT Events',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #EF4444; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
              .button { display: inline-block; background-color: #EF4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .warning { background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 15px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Request 🔐</h1>
              </div>
              <div class="content">
                <h2>Reset Your Password</h2>
                <p>We received a request to reset your password for your MyINSAT Events account. Click the button below to choose a new password:</p>
                <div style="text-align: center;">
                  <a href="${resetUrl}" class="button">Reset Password</a>
                </div>
                <p>Or copy and paste this link in your browser:</p>
                <p style="word-break: break-all; color: #EF4444;">${resetUrl}</p>
                <div class="warning">
                  <strong>⚠️ Security Notice:</strong>
                  <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>This link will expire in 1 hour</li>
                    <li>If you didn't request a password reset, please ignore this email</li>
                    <li>Your current password will remain unchanged until you set a new one</li>
                  </ul>
                </div>
              </div>
              <div class="footer">
                <p>&copy; 2026 MyINSAT Events. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `Password Reset Request\n\nWe received a request to reset your password for your MyINSAT Events account.\n\nReset your password by clicking the following link:\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email. Your password will remain unchanged.`,
    });
  }

  async sendEventReminder(to: string, eventTitle: string, eventDate: Date, eventLocation: string): Promise<void> {
    await this.sendMail({
      to,
      subject: `Reminder: ${eventTitle} is coming soon! - MyINSAT Events`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #10B981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
              .event-details { background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10B981; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📅 Event Reminder</h1>
              </div>
              <div class="content">
                <h2>Don't forget!</h2>
                <p>This is a friendly reminder about your upcoming event:</p>
                <div class="event-details">
                  <h3 style="margin-top: 0; color: #10B981;">🎉 ${eventTitle}</h3>
                  <p><strong>📅 Date:</strong> ${eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p><strong>🕐 Time:</strong> ${eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                  <p><strong>📍 Location:</strong> ${eventLocation}</p>
                </div>
                <p>We're looking forward to seeing you there! 🎊</p>
              </div>
              <div class="footer">
                <p>&copy; 2026 MyINSAT Events. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `Event Reminder\n\nDon't forget about your upcoming event!\n\nEvent: ${eventTitle}\nDate: ${eventDate.toLocaleDateString()}\nTime: ${eventDate.toLocaleTimeString()}\nLocation: ${eventLocation}\n\nWe're looking forward to seeing you there!`,
    });
  }

  async sendRegistrationConfirmation(
    to: string,
    eventTitle: string,
    eventDate: Date,
    eventLocation: string,
  ): Promise<void> {
    await this.sendMail({
      to,
      subject: `Registration confirmed: ${eventTitle} - MyINSAT Events`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #10B981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
              .success-badge { background-color: #D1FAE5; color: #065F46; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 20px 0; }
              .event-details { background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10B981; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✅ Registration Confirmed!</h1>
              </div>
              <div class="content">
                <div style="text-align: center;">
                  <span class="success-badge">✨ You're all set!</span>
                </div>
                <h2>Thank you for registering!</h2>
                <p>Your registration for the following event has been confirmed:</p>
                <div class="event-details">
                  <h3 style="margin-top: 0; color: #10B981;">🎉 ${eventTitle}</h3>
                  <p><strong>📅 Date:</strong> ${eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p><strong>🕐 Time:</strong> ${eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                  <p><strong>📍 Location:</strong> ${eventLocation}</p>
                </div>
                <p>We'll send you a reminder before the event. See you there! 🎊</p>
              </div>
              <div class="footer">
                <p>&copy; 2026 MyINSAT Events. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `Registration Confirmed!\n\nYour registration for the following event has been confirmed:\n\nEvent: ${eventTitle}\nDate: ${eventDate.toLocaleDateString()}\nTime: ${eventDate.toLocaleTimeString()}\nLocation: ${eventLocation}\n\nWe'll send you a reminder before the event. See you there!`,
    });
  }
}
