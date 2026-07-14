import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateGameService } from './application/create-game.service';
import { QueryGameService } from './application/query-game.service';
import { GameProgressService } from './application/game-progress.service';
import { GameScoringService } from './application/game-scoring.service';
import { GameResponseMapper } from './mappers/game-response.mapper';
import {
  GameDetailResponseDto,
  GameListResponseDto,
  GameMutationResponseDto,
} from './dto/game-response.dto';
import {
  CreateGameDto,
  RevealAnswerDto,
  AwardPointsDto,
  SkipQuestionDto,
} from './dto/create-game.dto';
import { Game } from './schemas/game.schema';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import {
  gameExample,
  ids,
  revealedGameExample,
} from '../../common/swagger/examples';

@ApiTags('Games')
@ApiBearerAuth()
@Controller('games')
@UseGuards(JwtAuthGuard)
export class GamesController {
  constructor(
    private readonly createGame: CreateGameService,
    private readonly queryGames: QueryGameService,
    private readonly progress: GameProgressService,
    private readonly scoring: GameScoringService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    operationId: 'gamesCreate',
    summary: 'Create a new game with 2 teams',
  })
  @ApiBody({
    type: CreateGameDto,
    examples: {
      default: {
        summary: 'Create game',
        value: {
          name: 'Friday Family Game',
          teams: [
            { name: 'Team Falcons', members: ['Muath', 'Sara'] },
            { name: 'Team Stars', members: ['Noura', 'Fahad'] },
          ],
          categoryIds: [ids.category, ids.categoryTwo],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Game created successfully',
    type: GameMutationResponseDto,
    schema: {
      example: {
        statusCode: 201,
        message: 'Game created successfully',
        data: gameExample,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
    schema: {
      example: {
        statusCode: 400,
        message: 'Exactly 2 teams are required',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Subscription required after free game is used',
    schema: {
      example: {
        statusCode: 403,
        message: 'You need an active subscription to create more games.',
        error: 'Forbidden',
      },
    },
  })
  async create(
    @Body() createGameDto: CreateGameDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{
    statusCode: number;
    message: string;
    data: Game;
  }> {
    const game = await this.createGame.execute(createGameDto, user);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Game created successfully',
      data: GameResponseMapper.toResponse(game) as unknown as Game,
    };
  }

  @Get()
  @ApiOperation({ operationId: 'gamesList', summary: 'Get all games' })
  @ApiResponse({
    status: 200,
    description: 'Games retrieved successfully',
    type: GameListResponseDto,
    schema: {
      example: {
        statusCode: 200,
        data: [gameExample],
      },
    },
  })
  async findAll(@CurrentUser() user: AuthenticatedUser): Promise<{
    statusCode: number;
    data: Game[];
  }> {
    const games = await this.queryGames.list(user);
    return {
      statusCode: HttpStatus.OK,
      data: GameResponseMapper.toResponseList(games) as unknown as Game[],
    };
  }

  @Get(':id')
  @ApiOperation({
    operationId: 'gamesGetById',
    summary: 'Get a specific game by ID',
  })
  @ApiParam({
    name: 'id',
    example: ids.game,
    description: 'Game MongoDB ObjectId',
  })
  @ApiResponse({
    status: 200,
    description: 'Game retrieved successfully. Answers hidden by default.',
    type: GameDetailResponseDto,
    schema: {
      example: {
        statusCode: 200,
        data: gameExample,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Game not found',
    schema: {
      example: {
        statusCode: 404,
        message: `Game with ID "${ids.game}" not found`,
        error: 'Not Found',
      },
    },
  })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{
    statusCode: number;
    data: Game;
  }> {
    const game = await this.queryGames.get(id, user);
    return {
      statusCode: HttpStatus.OK,
      data: GameResponseMapper.toResponse(game) as unknown as Game,
    };
  }

  @Post(':id/reveal-answer')
  @ApiOperation({
    operationId: 'gamesRevealAnswer',
    summary: 'Reveal the correct answer for a question',
  })
  @ApiParam({
    name: 'id',
    example: ids.game,
    description: 'Game MongoDB ObjectId',
  })
  @ApiBody({
    type: RevealAnswerDto,
    examples: {
      default: {
        summary: 'Reveal answer',
        value: {
          questionId: ids.question,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Answer revealed successfully',
    type: GameMutationResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Answer revealed successfully',
        data: revealedGameExample,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - question not found in game',
    schema: {
      example: {
        statusCode: 400,
        message: 'Question not found in this game board',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async revealAnswer(
    @Param('id') id: string,
    @Body() revealAnswerDto: RevealAnswerDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{
    statusCode: number;
    message: string;
    data: Game;
  }> {
    const game = await this.progress.reveal(id, revealAnswerDto, user);
    return {
      statusCode: HttpStatus.OK,
      message: 'Answer revealed successfully',
      data: GameResponseMapper.toResponse(game) as unknown as Game,
    };
  }

  @Post(':id/award-points')
  @ApiOperation({
    operationId: 'gamesAwardPoints',
    summary: 'Award points to a team for answering correctly',
  })
  @ApiParam({
    name: 'id',
    example: ids.game,
    description: 'Game MongoDB ObjectId',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['questionId', 'teamIndex'],
      properties: {
        questionId: {
          type: 'string',
          example: ids.question,
        },
        teamIndex: {
          type: 'number',
          example: 0,
        },
      },
    },
    examples: {
      default: {
        summary: 'Award points to team 0',
        value: {
          questionId: ids.question,
          teamIndex: 0,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Points awarded successfully',
    type: GameMutationResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Points awarded successfully',
        data: {
          ...revealedGameExample,
          teams: [
            { name: 'Team Falcons', members: ['Muath', 'Sara'], score: 200 },
            { name: 'Team Stars', members: ['Noura', 'Fahad'], score: 0 },
          ],
          currentTurnTeamIndex: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid teamIndex or question already answered',
    schema: {
      example: {
        statusCode: 400,
        message: 'Question is already answered',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async awardPoints(
    @Param('id') id: string,
    @Body() awardPointsDto: AwardPointsDto & { teamIndex: number },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{
    statusCode: number;
    message: string;
    data: Game;
  }> {
    const { teamIndex, ...dto } = awardPointsDto;

    if (teamIndex === undefined || teamIndex === null) {
      throw new BadRequestException(
        'teamIndex is required in the request body',
      );
    }

    const game = await this.scoring.award(id, dto, teamIndex, user);
    return {
      statusCode: HttpStatus.OK,
      message: 'Points awarded successfully',
      data: GameResponseMapper.toResponse(game) as unknown as Game,
    };
  }

  @Post(':id/skip-question')
  @ApiOperation({
    operationId: 'gamesSkipQuestion',
    summary: 'Skip a question without awarding points',
  })
  @ApiParam({
    name: 'id',
    example: ids.game,
    description: 'Game MongoDB ObjectId',
  })
  @ApiBody({
    type: SkipQuestionDto,
    examples: {
      default: {
        summary: 'Skip question',
        value: {
          questionId: ids.question,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Question skipped successfully',
    type: GameMutationResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Question skipped successfully',
        data: {
          ...revealedGameExample,
          currentTurnTeamIndex: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - question already answered',
    schema: {
      example: {
        statusCode: 400,
        message: 'Question is already answered',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async skipQuestion(
    @Param('id') id: string,
    @Body() skipQuestionDto: SkipQuestionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{
    statusCode: number;
    message: string;
    data: Game;
  }> {
    const game = await this.progress.skip(id, skipQuestionDto, user);
    return {
      statusCode: HttpStatus.OK,
      message: 'Question skipped successfully',
      data: GameResponseMapper.toResponse(game) as unknown as Game,
    };
  }
}
