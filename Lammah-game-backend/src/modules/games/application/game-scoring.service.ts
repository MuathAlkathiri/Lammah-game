import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { AwardPointsDto } from '../dto/create-game.dto';
import { GamesService } from '../games.service';

@Injectable()
export class GameScoringService {
  constructor(private readonly games: GamesService) {}
  award(
    id: string,
    dto: AwardPointsDto,
    teamIndex: number,
    user: AuthenticatedUser,
  ) {
    return this.games.awardPoints(id, dto, teamIndex, user);
  }
}
