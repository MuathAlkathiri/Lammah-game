import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum GameStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  FINISHED = 'finished',
}

export enum QuestionSelectionMode {
  FIXED = 'fixed',
  RANDOM = 'random',
}

export interface TeamData {
  name: string;
  members: string[];
  score: number;
}

export interface QuestionInGame {
  question: Types.ObjectId;
  points: 200 | 400 | 600;
  isAnswered: boolean;
  isAnswerRevealed: boolean;
  answeredByTeamIndex?: number;
  awardedPoints?: number;
}

export interface CategoryBoard {
  category: Types.ObjectId;
  questions: QuestionInGame[];
}

@Schema({ timestamps: true, optimisticConcurrency: true })
export class Game extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({
    type: String,
    enum: GameStatus,
    default: GameStatus.ACTIVE,
  })
  status: GameStatus;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  owner: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isFreeGame: boolean;

  @Prop({
    type: String,
    enum: QuestionSelectionMode,
    required: true,
  })
  questionSelectionMode: QuestionSelectionMode;

  @Prop({
    type: [
      {
        name: { type: String, required: true },
        members: { type: [String], default: [] },
        score: { type: Number, default: 0 },
      },
    ],
    required: true,
  })
  teams: TeamData[];

  @Prop({
    type: [
      {
        type: Types.ObjectId,
        ref: 'Category',
      },
    ],
    required: true,
  })
  selectedCategories: Types.ObjectId[];

  @Prop({
    type: [
      {
        category: { type: Types.ObjectId, ref: 'Category', required: true },
        questions: [
          {
            question: { type: Types.ObjectId, ref: 'Question', required: true },
            points: { type: Number, enum: [200, 400, 600], required: true },
            isAnswered: { type: Boolean, default: false },
            isAnswerRevealed: { type: Boolean, default: false },
            answeredByTeamIndex: { type: Number },
            awardedPoints: { type: Number },
          },
        ],
      },
    ],
    required: true,
  })
  board: CategoryBoard[];

  @Prop({ type: Number, default: 0 })
  currentTurnTeamIndex: number;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;

  @Prop()
  finishedAt?: Date;
}

export const GameSchema = SchemaFactory.createForClass(Game);
