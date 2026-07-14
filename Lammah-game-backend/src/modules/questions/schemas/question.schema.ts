import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { Catalog } from '../../catalogs/schemas/catalog.schema';

export enum DifficultyLevel {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export enum QuestionType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  GIF = 'gif',
}

export enum GameMode {
  TRIVIA = 'trivia',
  IDENTIFY_CHARACTER = 'identifyCharacter',
  IDENTIFY_VOICE = 'identifyVoice',
  IDENTIFY_IMAGE = 'identifyImage',
  COMPLETE_QUOTE = 'completeQuote',
  TIMELINE = 'timeline',
  EMOJI_PUZZLE = 'emojiPuzzle',
  IDENTIFY_SONG = 'identifySong',
  IDENTIFY_SINGER = 'identifySinger',
  IDENTIFY_MUSIC_INTRO = 'identifyMusicIntro',
}

export enum QuestionAssetType {
  AUDIO = 'audio',
  IMAGE = 'image',
  VIDEO = 'video',
  GIF = 'gif',
}

export enum AssetStatus {
  NOT_REQUIRED = 'NOT_REQUIRED',
  PENDING = 'PENDING',
  READY = 'READY',
  FAILED = 'FAILED',
}

export enum QuestionPoints {
  LOW = 200,
  MEDIUM = 400,
  HIGH = 600,
}

export enum QuestionStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  // Legacy status kept for existing admin review screens and old documents.
  REJECTED = 'rejected',
}

export enum QuestionSource {
  MANUAL = 'manual',
  AI = 'ai',
  IMPORTED = 'imported',
  // Legacy source kept for admin-uploaded music questions.
  MUSIC = 'music',
}

export class QuestionPrimaryAsset {
  type: QuestionAssetType;
  url: string;
  source: string;
  sourceUrl?: string;
  searchQuery?: string;
  provider?: string;
  localPath?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export class QuestionCoverImage {
  type: 'image';
  url: string;
  source: string;
  sourceUrl?: string;
  provider?: string;
  localPath?: string;
  metadata?: Record<string, unknown>;
}

const PrimaryAssetSchema = new MongooseSchema(
  {
    type: { type: String, enum: QuestionAssetType, required: true },
    url: { type: String, required: true },
    source: { type: String, required: true },
    sourceUrl: String,
    searchQuery: String,
    provider: String,
    localPath: String,
    duration: Number,
    metadata: MongooseSchema.Types.Mixed,
  },
  { _id: false },
);

const CoverImageSchema = new MongooseSchema(
  {
    type: { type: String, enum: ['image'], required: true },
    url: { type: String, required: true },
    source: { type: String, required: true },
    sourceUrl: String,
    provider: String,
    localPath: String,
    metadata: MongooseSchema.Types.Mixed,
  },
  { _id: false },
);

@Schema({ timestamps: true })
export class Question extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: 'Category',
    required: true,
  })
  category: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Catalog.name })
  catalogId?: Types.ObjectId;

  @Prop({ required: true })
  question: string;

  @Prop()
  correctAnswer?: string;

  @Prop({ type: [String], default: undefined })
  wrongAnswers?: string[];

  @Prop({ required: true })
  answer: string;

  @Prop()
  explanation?: string;

  @Prop({
    type: String,
    enum: DifficultyLevel,
    required: true,
  })
  difficulty: DifficultyLevel;

  @Prop({
    type: Number,
    enum: QuestionPoints,
    required: true,
  })
  points: QuestionPoints;

  @Prop({
    type: Number,
    enum: QuestionPoints,
  })
  score?: QuestionPoints;

  @Prop({
    type: String,
    enum: GameMode,
    default: GameMode.TRIVIA,
  })
  gameMode?: GameMode;

  @Prop({
    type: String,
    enum: QuestionType,
    default: QuestionType.TEXT,
  })
  type: QuestionType;

  @Prop({ type: PrimaryAssetSchema, required: false })
  primaryAsset?: QuestionPrimaryAsset | null;

  @Prop({ type: CoverImageSchema, required: false })
  coverImage?: QuestionCoverImage | null;

  @Prop({ type: MongooseSchema.Types.Mixed })
  primaryAssetRequest?: Record<string, unknown> | null;

  @Prop({ type: MongooseSchema.Types.Mixed })
  coverImageRequest?: Record<string, unknown> | null;

  @Prop({ type: String, enum: AssetStatus })
  coverImageStatus?: AssetStatus;

  @Prop()
  coverImageFailureReason?: string;

  @Prop()
  mediaUrl?: string;

  @Prop()
  mediaKey?: string;

  @Prop({ type: Types.ObjectId, ref: 'MusicTrack' })
  musicTrack?: Types.ObjectId;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  @Prop()
  qualityScore?: number;

  @Prop({ type: [String], default: undefined })
  issues?: string[];

  @Prop({
    type: String,
    enum: AssetStatus,
    default: AssetStatus.NOT_REQUIRED,
  })
  assetStatus?: AssetStatus;

  @Prop()
  assetFailureReason?: string;

  @Prop()
  assetFailureStep?: string;

  @Prop({ type: Object })
  assetFailureDiagnostics?: Record<string, unknown>;

  @Prop({ type: Object })
  gameplayMetadata?: Record<string, unknown>;

  @Prop({ type: Object })
  aiMetadata?: Record<string, unknown>;

  @Prop()
  spotifyTrackId?: string;

  @Prop()
  spotifyArtist?: string;

  @Prop()
  spotifyAlbumName?: string;

  @Prop()
  spotifyAlbumImageUrl?: string;

  @Prop()
  spotifyUrl?: string;

  @Prop({ type: Boolean, default: false })
  hasPreviewAudio?: boolean;

  @Prop({
    type: String,
    enum: QuestionStatus,
    default: QuestionStatus.DRAFT,
  })
  status: QuestionStatus;

  @Prop({
    type: String,
    enum: QuestionSource,
    default: QuestionSource.MANUAL,
  })
  source: QuestionSource;

  @Prop({ type: Boolean, default: false })
  isFreeGameQuestion: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);

function inferPrimaryAssetFromLegacyMedia(ret: Record<string, unknown>) {
  if (ret.primaryAsset || !ret.mediaUrl || ret.type === QuestionType.TEXT) {
    return;
  }

  if (
    ![
      QuestionType.AUDIO,
      QuestionType.IMAGE,
      QuestionType.VIDEO,
      QuestionType.GIF,
    ].includes(ret.type as QuestionType)
  ) {
    return;
  }

  ret.primaryAsset = {
    type: ret.type,
    url: ret.mediaUrl,
    source: ret.source ?? 'legacy',
    ...(ret.mediaKey ? { metadata: { mediaKey: ret.mediaKey } } : {}),
  };
}

function attachBackwardCompatibleFields<T extends object>(
  _doc: unknown,
  ret: T,
) {
  const value = ret as unknown as Record<string, unknown>;
  if (!value['correctAnswer'] && value['answer']) {
    value['correctAnswer'] = value['answer'];
  }

  if (!value['answer'] && value['correctAnswer']) {
    value['answer'] = value['correctAnswer'];
  }

  if (!value['score'] && value['points']) {
    value['score'] = value['points'];
  }

  if (!value['points'] && value['score']) {
    value['points'] = value['score'];
  }

  if (!value['categoryId'] && value['category']) {
    value['categoryId'] =
      typeof value['category'] === 'object' &&
      value['category'] &&
      '_id' in value['category']
        ? (value['category'] as { _id: unknown })._id
        : value['category'];
  }

  inferPrimaryAssetFromLegacyMedia(value);
  return ret;
}

QuestionSchema.set('toJSON', {
  virtuals: true,
  transform: attachBackwardCompatibleFields,
});
QuestionSchema.set('toObject', {
  virtuals: true,
  transform: attachBackwardCompatibleFields,
});
