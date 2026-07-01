import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

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
}

export enum QuestionPoints {
  LOW = 200,
  MEDIUM = 400,
  HIGH = 600,
}

export enum QuestionStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum QuestionSource {
  MANUAL = 'manual',
  AI = 'ai',
}

@Schema({ timestamps: true })
export class Question extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: 'Category',
    required: true,
  })
  category: Types.ObjectId;

  @Prop({ required: true })
  question: string;

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
    type: String,
    enum: QuestionType,
    default: QuestionType.TEXT,
  })
  type: QuestionType;

  @Prop()
  mediaUrl?: string;

  @Prop()
  mediaKey?: string;

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

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);
