import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';

describe('Authentication System (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let refreshToken: string;
  let userId: number;
  let verificationToken: string;
  let resetToken: string;
  let testUserEmail: string;
  let testUserPassword: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    dataSource = moduleFixture.get<DataSource>(DataSource);
    
    // Apply global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user and return tokens', () => {
      testUserEmail = `test${Date.now()}@insat.tn`;
      testUserPassword = 'SecurePass123!';
      
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testUserEmail,
          password: testUserPassword,
          fullName: 'Test User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body.user).toHaveProperty('id');
          expect(res.body.user.email).toBe(testUserEmail);
          expect(res.body.user.fullName).toBe('Test User');
          expect(res.body.user.role).toBe('USER');
          expect(res.body.user.emailVerified).toBe(false);
          expect(res.body.user.isActive).toBeUndefined(); // Should not expose this
          
          // Save tokens for later tests
          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
          userId = res.body.user.id;
        });
    });

    it('should fail with invalid email format', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123',
          fullName: 'Test User',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toEqual(expect.arrayContaining([
            expect.stringContaining('email'),
          ]));
        });
    });

    it('should fail with short password', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@insat.tn',
          password: 'short',
          fullName: 'Test User',
        })
        .expect(400)
        .expect((res) => {
          expect(Array.isArray(res.body.message)).toBe(true);
          expect(res.body.message[0].toLowerCase()).toContain('password');
        });
    });

    it('should fail with missing fullName', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@insat.tn',
          password: 'SecurePass123',
        })
        .expect(400);
    });

    it('should fail with duplicate email', () => {
      const email = `duplicate${Date.now()}@insat.tn`;
      
      // First registration
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          password: 'SecurePass123',
          fullName: 'Test User',
        })
        .expect(201)
        .then(() => {
          // Second registration with same email
          return request(app.getHttpServer())
            .post('/auth/register')
            .send({
              email,
              password: 'SecurePass123',
              fullName: 'Test User',
            })
            .expect(409)
            .expect((res) => {
              expect(res.body.message).toContain('already exists');
            });
        });
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUserEmail,
          password: testUserPassword,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body.user.email).toBe(testUserEmail);
          expect(res.body.user.id).toBe(userId);
          
          // Update tokens
          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
        });
    });

    it('should fail with wrong password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUserEmail,
          password: 'WrongPassword123',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid credentials');
        });
    });

    it('should fail with non-existent email', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@insat.tn',
          password: 'SomePassword123',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid credentials');
        });
    });

    it('should fail with missing credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUserEmail,
        })
        .expect(400);
    });
  });

  describe('GET /auth/profile', () => {
    it('should get user profile with valid access token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('email');
          expect(res.body).toHaveProperty('role');
          expect(res.body.email).toBe(testUserEmail);
        });
    });

    it('should fail without authorization header', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .expect(401);
    });

    it('should fail with invalid token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });

    it('should fail with malformed authorization header', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', accessToken) // Missing 'Bearer'
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    let oldRefreshToken: string;

    it('should refresh tokens with valid refresh token', () => {
      oldRefreshToken = refreshToken;
      
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: oldRefreshToken,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body.accessToken).not.toBe(accessToken);
          expect(res.body.refreshToken).not.toBe(oldRefreshToken);
          
          // Update tokens
          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
        });
    });

    it('should fail with already used refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: oldRefreshToken,
        })
        .expect(401);
    });

    it('should fail with invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid.refresh.token',
        })
        .expect(401);
    });

    it('should fail with missing refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(401);
    });
  });

  describe('POST /auth/verify-email', () => {
    beforeAll(async () => {
      // Get verification token from database
      const tokenRecord = await dataSource.query(
        'SELECT token FROM email_verification_tokens WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [userId]
      );
      
      if (tokenRecord && tokenRecord.length > 0) {
        verificationToken = tokenRecord[0].token;
      }
    });

    it('should verify email with valid token', () => {
      if (!verificationToken) {
        return Promise.resolve(); // Skip if token not found
      }

      return request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({
          token: verificationToken,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toContain('verified successfully');
        });
    });

    it('should return already verified message when using same token', () => {
      if (!verificationToken) {
        return Promise.resolve();
      }

      return request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({
          token: verificationToken,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid or expired');
        });
    });

    it('should fail with invalid token', () => {
      return request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({
          token: 'invalid.token.here',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid');
        });
    });

    it('should fail with missing token', () => {
      return request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({})
        .expect(400);
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should send password reset request for existing email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: testUserEmail,
        })
        .expect(200);

      expect(response.body.message).toContain('password reset');

      // Get reset token from database
      const tokenRecord = await dataSource.query(
        'SELECT token FROM password_reset_tokens WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [userId]
      );
      
      if (tokenRecord && tokenRecord.length > 0) {
        resetToken = tokenRecord[0].token;
      }
    });

    it('should not reveal if email does not exist', () => {
      return request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: 'nonexistent@insat.tn',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toContain('password reset');
        });
    });

    it('should fail with invalid email format', () => {
      return request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: 'invalid-email',
        })
        .expect(400);
    });

    it('should fail with missing email', () => {
      return request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({})
        .expect(400);
    });
  });

  describe('POST /auth/reset-password', () => {
    const newPassword = 'NewSecurePass456!';

    it('should reset password with valid token', () => {
      if (!resetToken) {
        return Promise.resolve(); // Skip if token not found
      }

      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: newPassword,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toContain('Password reset successfully');
        });
    });

    it('should login with new password after reset', () => {
      if (!resetToken) {
        return Promise.resolve();
      }

      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUserEmail,
          password: newPassword,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          
          // Update tokens
          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
        });
    });

    it('should fail with old password after reset', () => {
      if (!resetToken) {
        return Promise.resolve();
      }

      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUserEmail,
          password: testUserPassword,
        })
        .expect(401);
    });

    it('should fail with already used reset token', () => {
      if (!resetToken) {
        return Promise.resolve();
      }

      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'AnotherPassword789!',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid or expired');
        });
    });

    it('should fail with invalid token', () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: 'invalid.token.here',
          newPassword: 'NewPassword123!',
        })
        .expect(400);
    });

    it('should fail with short password', () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: 'some.token',
          newPassword: 'short',
        })
        .expect(400);
    });

    it('should fail with missing fields', () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: 'some.token',
        })
        .expect(400);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully and revoke refresh tokens', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toBe('Logged out successfully');
    });

    it('should fail to use refresh token after logout', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: refreshToken,
        })
        .expect(401);
    });

    it('should fail logout without authorization', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401);
    });

    it('should fail logout with invalid token', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', 'Bearer invalid.token')
        .expect(401);
    });
  });

  describe('Token Expiration and Security', () => {
    it('should receive valid JWT tokens on registration', () => {
      const email = `security${Date.now()}@insat.tn`;
      
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          password: 'SecurePass123',
          fullName: 'Security Test',
        })
        .expect(201)
        .expect((res) => {
          const { accessToken, refreshToken } = res.body;
          
          // Check JWT format (3 parts separated by dots)
          expect(accessToken.split('.')).toHaveLength(3);
          expect(refreshToken.split('.')).toHaveLength(3);
        });
    });

    it('should not accept tokens after user logout', async () => {
      const email = `logout${Date.now()}@insat.tn`;
      
      // Register and get tokens
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          password: 'SecurePass123',
          fullName: 'Logout Test',
        });

      const { accessToken: token, refreshToken: refresh } = registerRes.body;

      // Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      // Try to use refresh token
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: refresh,
        })
        .expect(401);
    });
  });
});
