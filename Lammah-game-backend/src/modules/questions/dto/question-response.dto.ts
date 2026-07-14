import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AssetStatus,
  DifficultyLevel,
  GameMode,
  QuestionAssetType,
  QuestionSource,
  QuestionStatus,
} from '../schemas/question.schema';

export class QuestionAssetResponseDto {
  @ApiProperty({ enum: QuestionAssetType, enumName: 'QuestionAssetType' })
  type!: QuestionAssetType;
  @ApiProperty() url!: string;
  @ApiProperty() source!: string;
  @ApiPropertyOptional() sourceUrl?: string;
  @ApiPropertyOptional() searchQuery?: string;
  @ApiPropertyOptional() provider?: string;
  @ApiPropertyOptional() duration?: number;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  metadata?: Record<string, unknown>;
}

export class QuestionResponseDto {
  @ApiProperty() _id!: string;
  @ApiPropertyOptional() id?: string;
  @ApiPropertyOptional() category?: string;
  @ApiPropertyOptional() categoryId?: string;
  @ApiProperty() question!: string;
  @ApiPropertyOptional() answer?: string;
  @ApiPropertyOptional() correctAnswer?: string;
  @ApiProperty({ type: [String] }) wrongAnswers!: string[];
  @ApiPropertyOptional() explanation?: string;
  @ApiProperty({ enum: DifficultyLevel, enumName: 'DifficultyLevel' })
  difficulty!: DifficultyLevel;
  @ApiPropertyOptional({ enum: [200, 400, 600] }) points?: number;
  @ApiPropertyOptional({ enum: [200, 400, 600] }) score?: number;
  @ApiPropertyOptional({ enum: GameMode, enumName: 'GameMode' })
  gameMode?: GameMode;
  @ApiPropertyOptional() type?: string;
  @ApiProperty({ enum: QuestionStatus, enumName: 'QuestionStatus' })
  status!: QuestionStatus;
  @ApiProperty({ enum: QuestionSource, enumName: 'QuestionSource' })
  source!: QuestionSource;
  @ApiPropertyOptional({ type: QuestionAssetResponseDto, nullable: true })
  primaryAsset?: QuestionAssetResponseDto | null;
  @ApiPropertyOptional({ type: QuestionAssetResponseDto, nullable: true })
  coverImage?: QuestionAssetResponseDto | null;
  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  primaryAssetRequest?: Record<string, unknown> | null;
  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  coverImageRequest?: Record<string, unknown> | null;
  @ApiPropertyOptional({ enum: AssetStatus, enumName: 'AssetStatus' })
  coverImageStatus?: AssetStatus;
  @ApiPropertyOptional() coverImageFailureReason?: string;
  @ApiPropertyOptional({ enum: AssetStatus, enumName: 'AssetStatus' })
  assetStatus?: AssetStatus;
  @ApiPropertyOptional() assetFailureReason?: string;
  @ApiPropertyOptional() assetFailureStep?: string;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  assetFailureDiagnostics?: Record<string, unknown>;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  gameplayMetadata?: Record<string, unknown>;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  aiMetadata?: Record<string, unknown>;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  metadata?: Record<string, unknown>;
  @ApiPropertyOptional() mediaUrl?: string;
  @ApiPropertyOptional() hasPreviewAudio?: boolean;
  @ApiPropertyOptional() isFreeGameQuestion?: boolean;
  @ApiPropertyOptional() qualityScore?: number;
  @ApiPropertyOptional({ type: [String] }) issues?: string[];
  @ApiPropertyOptional({ format: 'date-time' }) createdAt?: string;
  @ApiPropertyOptional({ format: 'date-time' }) updatedAt?: string;
}

export class QuestionListResponseDto {
  @ApiProperty({ example: 200 }) statusCode!: number;
  @ApiProperty({ type: [QuestionResponseDto] }) data!: QuestionResponseDto[];
}

export class QuestionDetailResponseDto {
  @ApiProperty({ example: 200 }) statusCode!: number;
  @ApiProperty({ type: QuestionResponseDto }) data!: QuestionResponseDto;
}

export class QuestionMutationResponseDto extends QuestionDetailResponseDto {
  @ApiProperty() message!: string;
}

export class BulkQuestionActionResponseDto {
  @ApiProperty() modifiedCount!: number;
}
