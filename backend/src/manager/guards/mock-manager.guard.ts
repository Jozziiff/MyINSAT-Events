import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class MockManagerGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();

        request.user = {
            id: 1,
            email: 'hamza@insat.tn',
            role: 'MANAGER',
            clubId: 1,
        };

        return true;
    }
}
