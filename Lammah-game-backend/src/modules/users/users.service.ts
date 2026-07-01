import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserRole, SubscriptionStatus } from './schemas/user.schema';

export type SafeUser = Omit<User, 'password'>;

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(data: {
    fullName: string;
    email: string;
    password: string;
    role?: UserRole;
  }): Promise<User> {
    const email = data.email.toLowerCase().trim();
    const existingUser = await this.userModel.findOne({ email }).exec();

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    return this.userModel.create({
      ...data,
      email,
      role: data.role ?? UserRole.USER,
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase().trim() })
      .select('+password')
      .exec();
  }

  async findById(id: string | Types.ObjectId): Promise<User> {
    const user = await this.userModel.findById(id).exec();

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return user;
  }

  async findByIdWithPassword(id: string | Types.ObjectId): Promise<User | null> {
    return this.userModel.findById(id).select('+password').exec();
  }

  async incrementFreeGamesUsed(id: string | Types.ObjectId): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(id, {
        $inc: { freeGamesUsed: 1 },
        updatedAt: new Date(),
      })
      .exec();
  }

  async updateSubscription(
    id: string,
    subscriptionStatus: SubscriptionStatus,
    subscriptionExpiresAt?: Date,
  ): Promise<User> {
    const updateData: Partial<User> = {
      subscriptionStatus,
      subscriptionExpiresAt,
      updatedAt: new Date(),
    };

    const user = await this.userModel
      .findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .exec();

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return user;
  }
}

