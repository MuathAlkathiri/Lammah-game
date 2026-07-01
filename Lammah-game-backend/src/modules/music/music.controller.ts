import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/schemas/user.schema';
import {
  GenerateMusicGuessQuestionDto,
  SearchSpotifyTrackQueryDto,
  ValidateMusicGuessAnswerDto,
} from './dto/music.dto';
import { MusicService } from './music.service';

@ApiTags('Music')
@ApiBearerAuth()
@Controller('music')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class MusicController {
  constructor(private readonly musicService: MusicService) {}

  @Get('spotify/search')
  @ApiOperation({ summary: 'Search Spotify for a track' })
  @ApiQuery({ name: 'title', required: true, example: 'Blinding Lights' })
  @ApiQuery({ name: 'artist', required: false, example: 'The Weeknd' })
  @ApiResponse({
    status: 200,
    description: 'Spotify track found',
  })
  async searchSpotifyTrack(@Query() query: SearchSpotifyTrackQueryDto) {
    const data = await this.musicService.searchTrack(query.title, query.artist);

    return {
      statusCode: HttpStatus.OK,
      data,
    };
  }

  @Post('spotify/generate-question')
  @ApiOperation({
    summary: 'Generate a music guess question from Spotify track metadata',
    description:
      'Spotify is the source of truth for the correct answer. This endpoint does not create multiple-choice options.',
  })
  @ApiBody({
    type: GenerateMusicGuessQuestionDto,
    examples: {
      default: {
        value: {
          title: 'Blinding Lights',
          artist: 'The Weeknd',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Music guess question generated',
  })
  async generateMusicGuessQuestion(
    @Body() body: GenerateMusicGuessQuestionDto,
  ) {
    const data =
      await this.musicService.generateMusicGuessQuestionFromSpotifyTrack(
        body.title,
        body.artist,
      );

    return {
      statusCode: HttpStatus.CREATED,
      data,
    };
  }

  @Post('spotify/validate-answer')
  @ApiOperation({ summary: 'Validate a typed music guess answer' })
  @ApiBody({
    type: ValidateMusicGuessAnswerDto,
    examples: {
      default: {
        value: {
          userAnswer: 'blinding lights',
          correctAnswer: 'Blinding Lights',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Answer validation result',
  })
  validateMusicGuessAnswer(@Body() body: ValidateMusicGuessAnswerDto) {
    const data = this.musicService.validateMusicGuessAnswer(
      body.userAnswer,
      body.correctAnswer,
    );

    return {
      statusCode: HttpStatus.CREATED,
      data,
    };
  }
}
