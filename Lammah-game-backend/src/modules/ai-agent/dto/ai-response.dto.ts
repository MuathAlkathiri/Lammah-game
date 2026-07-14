import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionResponseDto } from '../../questions/dto/question-response.dto';

const difficultyValues = ['easy', 'medium', 'hard'] as const;
const gameModeValues = [
  'trivia',
  'identifyCharacter',
  'identifyVoice',
  'identifyImage',
  'completeQuote',
  'timeline',
  'emojiPuzzle',
  'identifySong',
  'identifySinger',
  'identifyMusicIntro',
] as const;
const assetTypeValues = [
  'text',
  'image',
  'audio',
  'quote',
  'emoji',
  'timeline',
  'video',
  'gif',
] as const;
const assetStatusValues = [
  'NOT_REQUIRED',
  'PENDING',
  'READY',
  'FAILED',
] as const;

export class AiAssetRequestResponseDto {
  @ApiProperty({ enum: assetTypeValues }) type!: string;
  @ApiPropertyOptional({ enum: assetTypeValues }) assetType?: string;
  @ApiPropertyOptional() provider?: string;
  @ApiPropertyOptional() query?: string;
  @ApiPropertyOptional() entity?: string;
  @ApiPropertyOptional() franchise?: string;
  @ApiPropertyOptional() language?: string;
  @ApiPropertyOptional() originalName?: string;
  @ApiPropertyOptional() localizedName?: string;
  @ApiPropertyOptional() englishTitle?: string;
  @ApiPropertyOptional() arabicTitle?: string;
  @ApiPropertyOptional() context?: string;
  @ApiPropertyOptional() entityType?: string;
  @ApiPropertyOptional() visualHint?: string;
  @ApiPropertyOptional() categoryType?: string;
  @ApiPropertyOptional({ enum: ['gameplay', 'decorative'] }) purpose?: string;
  @ApiPropertyOptional() duration?: number;
  @ApiPropertyOptional() speaker?: string;
}

export class AiAssetResponseDto {
  @ApiProperty() localPath!: string;
  @ApiProperty() url!: string;
  @ApiProperty() source!: string;
  @ApiProperty() provider!: string;
  @ApiProperty({ enum: assetTypeValues }) type!: string;
  @ApiPropertyOptional() duration?: number;
  @ApiPropertyOptional() sourceUrl?: string;
  @ApiPropertyOptional() searchQuery?: string;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  metadata?: Record<string, unknown>;
}

export class AiAgentTraceResponseDto {
  @ApiProperty() agent!: string;
  @ApiProperty({ enum: ['completed', 'failed', 'fallback'] }) status!: string;
  @ApiProperty() durationMs!: number;
  @ApiPropertyOptional() reason?: string;
}

export class ReviewedQuestionDraftResponseDto {
  @ApiProperty() question!: string;
  @ApiProperty() correctAnswer!: string;
  @ApiProperty({ type: [String] }) wrongAnswers!: string[];
  @ApiProperty({ enum: difficultyValues }) difficulty!: string;
  @ApiProperty({ enum: gameModeValues }) gameMode!: string;
  @ApiProperty({ enum: assetTypeValues }) type!: string;
  @ApiPropertyOptional({ type: AiAssetRequestResponseDto, nullable: true })
  assetRequest?: AiAssetRequestResponseDto | null;
  @ApiProperty({ enum: assetStatusValues }) assetStatus!: string;
  @ApiPropertyOptional({ type: AiAssetResponseDto, nullable: true })
  asset?: AiAssetResponseDto | null;
  @ApiPropertyOptional({ type: AiAssetRequestResponseDto, nullable: true })
  primaryAssetRequest?: AiAssetRequestResponseDto | null;
  @ApiProperty({ enum: assetStatusValues }) primaryAssetStatus!: string;
  @ApiPropertyOptional({ type: AiAssetResponseDto, nullable: true })
  primaryAsset?: AiAssetResponseDto | null;
  @ApiPropertyOptional({ type: AiAssetRequestResponseDto, nullable: true })
  coverImageRequest?: AiAssetRequestResponseDto | null;
  @ApiProperty({ enum: assetStatusValues }) coverImageStatus!: string;
  @ApiPropertyOptional({ type: AiAssetResponseDto, nullable: true })
  coverImage?: AiAssetResponseDto | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  coverImageFailureReason?: string | null;
  @ApiPropertyOptional() assetFailureReason?: string;
  @ApiPropertyOptional() assetFailureStep?: string;
  @ApiPropertyOptional({
    oneOf: [
      { type: 'object', additionalProperties: true },
      {
        type: 'array',
        items: { type: 'object', additionalProperties: true },
      },
    ],
  })
  assetFailureDiagnostics?: Record<string, unknown> | Record<string, unknown>[];
  @ApiPropertyOptional() wasGameplayAutoFixed?: boolean;
  @ApiPropertyOptional() gameplayFixReason?: string;
  @ApiProperty() explanation!: string;
  @ApiProperty() qualityScore!: number;
  @ApiProperty({ type: [String] }) issues!: string[];
  @ApiPropertyOptional({ type: [AiAgentTraceResponseDto] })
  agentTrace?: AiAgentTraceResponseDto[];
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  gameplayMetadata?: Record<string, unknown>;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  aiMetadata?: Record<string, unknown>;
}

export class ReviewedQuestionsDataResponseDto {
  @ApiProperty({ type: [ReviewedQuestionDraftResponseDto] })
  questions!: ReviewedQuestionDraftResponseDto[];
}

export class GenerateReviewedQuestionsResponseDto {
  @ApiProperty({ example: 201 }) statusCode!: number;
  @ApiProperty() message!: string;
  @ApiProperty() count!: number;
  @ApiProperty({ type: 'object', additionalProperties: true })
  meta!: Record<string, unknown>;
  @ApiProperty({ type: ReviewedQuestionsDataResponseDto })
  data!: ReviewedQuestionsDataResponseDto;
}

export class GenerateQuestionsResponseDto {
  @ApiProperty({ example: 200 }) statusCode!: number;
  @ApiProperty() message!: string;
  @ApiProperty() count!: number;
  @ApiProperty({ type: [QuestionResponseDto] }) data!: QuestionResponseDto[];
}

export class AiToolDiagnosticsResponseDto {
  @ApiProperty() ffmpegAvailable!: boolean;
  @ApiProperty() ytDlpAvailable!: boolean;
  @ApiProperty() ffmpegVersion!: string;
  @ApiProperty() ytDlpVersion!: string;
}

export class SaveDraftFailureDto {
  @ApiProperty({ minimum: 0 }) index!: number;
  @ApiProperty() reason!: string;
}

export class SaveReviewedDraftsResponseDto {
  @ApiProperty({ minimum: 0 }) savedCount!: number;
  @ApiProperty({ minimum: 0 }) failedCount!: number;
  @ApiProperty({ type: [QuestionResponseDto] })
  savedQuestions!: QuestionResponseDto[];
  @ApiProperty({ type: [SaveDraftFailureDto] })
  failures!: SaveDraftFailureDto[];
}
