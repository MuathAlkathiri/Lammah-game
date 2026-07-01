import {
  IsString,
  IsOptional,
  IsEnum,
  IsMongoId,
  MinLength,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import {
  DifficultyLevel,
  QuestionType,
  QuestionStatus,
  QuestionSource,
  QuestionPoints,
} from '../schemas/question.schema';

export class CreateQuestionDto {
  @IsMongoId({ message: 'Category ID must be a valid MongoDB ID' })
  category: string;

  @IsString({ message: 'Question must be a string' })
  @MinLength(1, { message: 'Question is required' })
  question: string;

  @IsString({ message: 'Answer must be a string' })
  @MinLength(1, { message: 'Answer is required' })
  answer: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsEnum(DifficultyLevel, {
    message: 'Difficulty must be one of: easy, medium, hard',
  })
  difficulty: DifficultyLevel;

  @IsNumber()
  @IsEnum(QuestionPoints, {
    message: 'Points must be one of: 200, 400, 600',
  })
  points: QuestionPoints;

  @IsOptional()
  @IsEnum(QuestionType, {
    message: 'Type must be one of: text, image, audio, video',
  })
  type?: QuestionType;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  mediaKey?: string;

  @IsOptional()
  @IsEnum(QuestionStatus, {
    message: 'Status must be one of: draft, approved, rejected',
  })
  status?: QuestionStatus;

  @IsOptional()
  @IsEnum(QuestionSource, {
    message: 'Source must be one of: manual, ai',
  })
  source?: QuestionSource;

  @IsOptional()
  @IsBoolean()
  isFreeGameQuestion?: boolean;
}

export class UpdateQuestionDto {
  @IsOptional()
  @IsMongoId()
  category?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  question?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  answer?: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @IsOptional()
  @IsNumber()
  @IsEnum(QuestionPoints)
  points?: QuestionPoints;

  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  mediaKey?: string;

  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;

  @IsOptional()
  @IsEnum(QuestionSource)
  source?: QuestionSource;

  @IsOptional()
  @IsBoolean()
  isFreeGameQuestion?: boolean;
}
