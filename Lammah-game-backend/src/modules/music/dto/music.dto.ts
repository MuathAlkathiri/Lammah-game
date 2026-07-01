import { IsOptional, IsString, MinLength } from 'class-validator';
import {
  MusicGuessQuestion,
  MusicGuessAnswerValidation,
  SpotifyNormalizedTrack,
} from '../types/spotify.types';

export class SearchSpotifyTrackQueryDto {
  @IsString({ message: 'Title must be a string' })
  @MinLength(1, { message: 'Title is required' })
  title: string;

  @IsOptional()
  @IsString({ message: 'Artist must be a string' })
  @MinLength(1, { message: 'Artist cannot be empty' })
  artist?: string;
}

export class GenerateMusicGuessQuestionDto {
  @IsString({ message: 'Title must be a string' })
  @MinLength(1, { message: 'Title is required' })
  title: string;

  @IsOptional()
  @IsString({ message: 'Artist must be a string' })
  @MinLength(1, { message: 'Artist cannot be empty' })
  artist?: string;
}

export class ValidateMusicGuessAnswerDto {
  @IsString({ message: 'User answer must be a string' })
  @MinLength(1, { message: 'User answer is required' })
  userAnswer: string;

  @IsString({ message: 'Correct answer must be a string' })
  @MinLength(1, { message: 'Correct answer is required' })
  correctAnswer: string;
}

export type SearchSpotifyTrackResponseDto = SpotifyNormalizedTrack;
export type GenerateMusicGuessQuestionResponseDto = MusicGuessQuestion;
export type ValidateMusicGuessAnswerResponseDto = MusicGuessAnswerValidation;
