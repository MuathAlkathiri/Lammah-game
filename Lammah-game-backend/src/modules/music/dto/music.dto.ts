import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { DifficultyLevel } from '../../questions/schemas/question.schema';
import { MusicTrackLanguage } from '../schemas/music-track.schema';

export class UploadMusicTrackDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  artist?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  album?: string;

  @IsOptional()
  @IsEnum(MusicTrackLanguage)
  language?: MusicTrackLanguage;

  @IsOptional()
  @IsString()
  @MinLength(1)
  genre?: string;

  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(10)
  @Max(20)
  snippetDurationSeconds?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  snippetStartSecond?: number;
}

export class UpdateMusicTrackDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  artist?: string;

  @IsOptional()
  @IsString()
  album?: string;

  @IsOptional()
  @IsString()
  artworkUrl?: string;

  @IsOptional()
  @IsEnum(MusicTrackLanguage)
  language?: MusicTrackLanguage;

  @IsOptional()
  @IsString()
  genre?: string;

  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class ValidateMusicQuestionAnswerDto {
  @IsMongoId({ message: 'questionId must be a valid MongoDB ID' })
  questionId: string;

  @IsString({ message: 'Answer must be a string' })
  @MinLength(1, { message: 'Answer is required' })
  answer: string;
}
