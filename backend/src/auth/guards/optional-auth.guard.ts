import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional authentication guard - allows requests to proceed even without a valid token.
 * If a valid token is present, it will populate req.user.
 * If no token or invalid token, req.user will be undefined.
 */
@Injectable()
export class OptionalAuth extends AuthGuard('jwt-access') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    // Don't throw an error if authentication fails
    // Just return undefined for user
    return user || undefined;
  }
}
