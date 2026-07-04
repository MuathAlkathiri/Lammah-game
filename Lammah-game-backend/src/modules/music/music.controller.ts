import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/schemas/user.schema';
import {
  UpdateMusicTrackDto,
  UploadMusicTrackDto,
  ValidateMusicQuestionAnswerDto,
} from './dto/music.dto';
import { MusicService } from './music.service';

@ApiTags('Admin Music Tracks')
@ApiBearerAuth()
@Controller('admin/music-tracks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminMusicTracksController {
  constructor(private readonly musicService: MusicService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024 * 1024,
      },
    }),
  )
  @ApiOperation({
    summary: 'Upload an audio file and create a guess-the-song question',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        artist: { type: 'string' },
        album: { type: 'string' },
        language: { type: 'string', enum: ['ar', 'en', 'other'] },
        genre: { type: 'string' },
        difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
        snippetDurationSeconds: { type: 'number', minimum: 10, maximum: 20 },
        snippetStartSecond: { type: 'number', minimum: 0 },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Music track and question created',
  })
  async upload(@UploadedFile() file: any, @Body() body: UploadMusicTrackDto) {
    const data = await this.musicService.createFromUpload(file, body);

    return {
      statusCode: HttpStatus.CREATED,
      data,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List uploaded music tracks' })
  async findAll() {
    const data = await this.musicService.findAll();

    return {
      statusCode: HttpStatus.OK,
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one uploaded music track' })
  async findOne(@Param('id') id: string) {
    const data = await this.musicService.findById(id);

    return {
      statusCode: HttpStatus.OK,
      data,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update music track metadata' })
  async update(@Param('id') id: string, @Body() body: UpdateMusicTrackDto) {
    const data = await this.musicService.update(id, body);

    return {
      statusCode: HttpStatus.OK,
      data,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a music track' })
  async remove(@Param('id') id: string) {
    const data = await this.musicService.softDelete(id);

    return {
      statusCode: HttpStatus.OK,
      data,
    };
  }
}

@ApiTags('Music Questions')
@Controller('music/questions')
export class MusicQuestionsController {
  constructor(private readonly musicService: MusicService) {}

  @Post('validate-answer')
  @ApiOperation({ summary: 'Validate a typed answer for a music question' })
  @ApiBody({
    type: ValidateMusicQuestionAnswerDto,
    examples: {
      default: {
        value: {
          questionId: '507f1f77bcf86cd799439011',
          answer: 'الأماكن',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Answer validation result',
  })
  async validateMusicQuestionAnswer(
    @Body() body: ValidateMusicQuestionAnswerDto,
  ) {
    const data = await this.musicService.validateAnswer(
      body.questionId,
      body.answer,
    );

    return {
      statusCode: HttpStatus.CREATED,
      data,
    };
  }
}
