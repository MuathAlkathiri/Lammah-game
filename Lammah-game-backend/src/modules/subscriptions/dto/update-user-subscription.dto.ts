import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { SubscriptionStatus } from '../../users/schemas/user.schema';

export class UpdateUserSubscriptionDto {
  @IsEnum(SubscriptionStatus)
  subscriptionStatus: SubscriptionStatus;

  @IsOptional()
  @IsDateString()
  subscriptionExpiresAt?: string;
}

