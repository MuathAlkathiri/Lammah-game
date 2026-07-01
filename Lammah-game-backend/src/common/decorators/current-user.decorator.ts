import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole, SubscriptionStatus } from '../../modules/users/schemas/user.schema';

export interface AuthenticatedUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  freeGamesUsed: number;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt?: Date;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest();
    return request.user;
  },
);

