import { Injectable } from '@nestjs/common';
import { UpdateUserSubscriptionDto } from './dto/update-user-subscription.dto';
import { UsersService } from '../users/users.service';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly usersService: UsersService) {}

  async updateUserSubscription(
    userId: string,
    dto: UpdateUserSubscriptionDto,
  ): Promise<User> {
    return this.usersService.updateSubscription(
      userId,
      dto.subscriptionStatus,
      dto.subscriptionExpiresAt ? new Date(dto.subscriptionExpiresAt) : undefined,
    );
  }
}

