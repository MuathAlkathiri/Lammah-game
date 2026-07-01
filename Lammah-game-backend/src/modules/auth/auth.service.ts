import {
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { AuthUserResponse, JwtPayload } from './auth.types';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/schemas/user.schema';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedAdmin();
  }

  async register(registerDto: RegisterDto): Promise<{
    accessToken: string;
    user: AuthUserResponse;
  }> {
    const password = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      fullName: registerDto.fullName,
      email: registerDto.email,
      password,
      role: UserRole.USER,
    });

    return this.buildAuthResponse(user);
  }

  async login(loginDto: LoginDto): Promise<{
    accessToken: string;
    user: AuthUserResponse;
  }> {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildAuthResponse(user);
  }

  async me(userId: string): Promise<AuthUserResponse> {
    const user = await this.usersService.findById(userId);
    return this.toAuthUserResponse(user);
  }

  private async seedAdmin(): Promise<void> {
    const email = this.configService.get<string>('ADMIN_EMAIL');
    const password = this.configService.get<string>('ADMIN_PASSWORD');
    const fullName =
      this.configService.get<string>('ADMIN_FULL_NAME') ?? 'Admin';

    if (!email || !password) {
      return;
    }

    const existingAdmin = await this.usersService.findByEmail(email);

    if (existingAdmin) {
      return;
    }

    await this.usersService.create({
      fullName,
      email,
      password: await bcrypt.hash(password, 10),
      role: UserRole.ADMIN,
    });
  }

  private buildAuthResponse(user: User): {
    accessToken: string;
    user: AuthUserResponse;
  } {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: this.toAuthUserResponse(user),
    };
  }

  private toAuthUserResponse(user: User): AuthUserResponse {
    return {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      subscriptionStatus: user.subscriptionStatus,
      freeGamesUsed: user.freeGamesUsed,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
    };
  }
}

