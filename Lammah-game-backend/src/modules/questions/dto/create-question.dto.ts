import {
  IsString,
  IsOptional,
  IsEnum,
  IsMongoId,
  MinLength,
  IsNumber,
  IsBoolean,
  IsArray,
  IsObject,
} from 'class-validator';
import {
  AssetStatus,
  DifficultyLevel,
  GameMode,
  QuestionAssetType,
  QuestionType,
  QuestionStatus,
  QuestionSource,
  QuestionPoints,
} from '../schemas/question.schema';

export class CreateQuestionDto {
  @IsOptional()
  @IsMongoId({ message: 'Category ID must be a valid MongoDB ID' })
  category?: string;

  @IsOptional()
  @IsMongoId({ message: 'Category ID must be a valid MongoDB ID' })
  categoryId?: string;

  @IsString({ message: 'Question must be a string' })
  @MinLength(1, { message: 'Question is required' })
  question: string;

  @IsOptional()
  @IsString({ message: 'Answer must be a string' })
  @MinLength(1, { message: 'Answer is required' })
  answer?: string;

  @IsOptional()
  @IsString({ message: 'Correct answer must be a string' })
  @MinLength(1, { message: 'Correct answer is required' })
  correctAnswer?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  wrongAnswers?: string[];

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsEnum(DifficultyLevel, {
    message: 'Difficulty must be one of: easy, medium, hard',
  })
  difficulty: DifficultyLevel;

  @IsOptional()
  @IsNumber()
  @IsEnum(QuestionPoints, {
    message: 'Points must be one of: 200, 400, 600',
  })
  points?: QuestionPoints;

  @IsOptional()
  @IsNumber()
  @IsEnum(QuestionPoints, {
    message: 'Score must be one of: 200, 400, 600',
  })
  score?: QuestionPoints;

  @IsOptional()
  @IsEnum(GameMode)
  gameMode?: GameMode;

  @IsOptional()
  @IsEnum(QuestionType, {
    message: 'Type must be one of: text, image, audio, video, gif',
  })
  type?: QuestionType;

  @IsOptional()
  @IsObject()
  primaryAsset?: {
    type: QuestionAssetType;
    url: string;
    source: string;
    sourceUrl?: string;
    searchQuery?: string;
    provider?: string;
    localPath?: string;
    duration?: number;
    metadata?: Record<string, unknown>;
  } | null;

  @IsOptional()
  @IsObject()
  coverImage?: {
    type: 'image';
    url: string;
    source: string;
    sourceUrl?: string;
    provider?: string;
    localPath?: string;
    metadata?: Record<string, unknown>;
  } | null;

  @IsOptional()
  @IsObject()
  primaryAssetRequest?: Record<string, unknown> | null;

  @IsOptional()
  @IsObject()
  coverImageRequest?: Record<string, unknown> | null;

  @IsOptional()
  @IsEnum(AssetStatus)
  coverImageStatus?: AssetStatus;

  @IsOptional()
  @IsString()
  coverImageFailureReason?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  mediaKey?: string;

  @IsOptional()
  @IsEnum(QuestionStatus, {
    message:
      'Status must be one of: draft, approved, published, archived, rejected',
  })
  status?: QuestionStatus;

  @IsOptional()
  @IsEnum(QuestionSource, {
    message: 'Source must be one of: manual, ai, imported, music',
  })
  source?: QuestionSource;

  @IsOptional()
  @IsNumber()
  qualityScore?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  issues?: string[];

  @IsOptional()
  @IsEnum(AssetStatus)
  assetStatus?: AssetStatus;

  @IsOptional()
  @IsString()
  assetFailureReason?: string;

  @IsOptional()
  @IsString()
  assetFailureStep?: string;

  @IsOptional()
  @IsObject()
  assetFailureDiagnostics?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  gameplayMetadata?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  aiMetadata?: Record<string, unknown>;

  @IsOptional()
  @IsMongoId()
  createdBy?: string;

  @IsOptional()
  @IsBoolean()
  isFreeGameQuestion?: boolean;
}

export class UpdateQuestionDto {
  @IsOptional()
  @IsMongoId()
  category?: string;

  @IsOptional()
  @IsMongoId()
  categoryId?: string;

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
  @MinLength(1)
  correctAnswer?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  wrongAnswers?: string[];

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
  @IsNumber()
  @IsEnum(QuestionPoints)
  score?: QuestionPoints;

  @IsOptional()
  @IsEnum(GameMode)
  gameMode?: GameMode;

  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  @IsOptional()
  @IsObject()
  primaryAsset?: CreateQuestionDto['primaryAsset'];

  @IsOptional()
  @IsObject()
  coverImage?: CreateQuestionDto['coverImage'];

  @IsOptional()
  @IsObject()
  primaryAssetRequest?: Record<string, unknown> | null;

  @IsOptional()
  @IsObject()
  coverImageRequest?: Record<string, unknown> | null;

  @IsOptional()
  @IsEnum(AssetStatus)
  coverImageStatus?: AssetStatus;

  @IsOptional()
  @IsString()
  coverImageFailureReason?: string;

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
  @IsNumber()
  qualityScore?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  issues?: string[];

  @IsOptional()
  @IsEnum(AssetStatus)
  assetStatus?: AssetStatus;

  @IsOptional()
  @IsString()
  assetFailureReason?: string;

  @IsOptional()
  @IsString()
  assetFailureStep?: string;

  @IsOptional()
  @IsObject()
  assetFailureDiagnostics?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  gameplayMetadata?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  aiMetadata?: Record<string, unknown>;

  @IsOptional()
  @IsMongoId()
  createdBy?: string;

  @IsOptional()
  @IsBoolean()
  isFreeGameQuestion?: boolean;
}
