import type {
  CreateQuestionDto,
  UpdateQuestionDto,
} from "@/api/generated/models";
import type { Question } from "@/types";

const toRequest = (data: Partial<Question>) => ({
  category: typeof data.category === "string" ? data.category : data.categoryId,
  categoryId: data.categoryId,
  question: data.question,
  answer: data.answer,
  correctAnswer: data.correctAnswer,
  wrongAnswers: data.wrongAnswers,
  explanation: data.explanation,
  difficulty: data.difficulty,
  points: data.points,
  score: data.score,
  gameMode: data.gameMode,
  type: data.type,
  primaryAsset: data.primaryAsset,
  coverImage: data.coverImage,
  primaryAssetRequest: data.primaryAssetRequest,
  coverImageRequest: data.coverImageRequest,
  coverImageStatus: data.coverImageStatus,
  coverImageFailureReason: data.coverImageFailureReason,
  mediaUrl: data.mediaUrl,
  mediaKey: data.mediaKey,
  status: data.status,
  source: data.source,
  qualityScore: data.qualityScore,
  issues: data.issues,
  assetStatus: data.assetStatus,
  assetFailureReason: data.assetFailureReason,
  assetFailureStep: data.assetFailureStep,
  assetFailureDiagnostics: data.assetFailureDiagnostics,
  gameplayMetadata: data.gameplayMetadata,
  aiMetadata: data.aiMetadata,
  isFreeGameQuestion: data.isFreeGameQuestion,
});

export const toCreateQuestionRequest = (
  data: Partial<Question>,
): CreateQuestionDto => toRequest(data);
export const toUpdateQuestionRequest = (
  data: Partial<Question>,
): UpdateQuestionDto => toRequest(data);
