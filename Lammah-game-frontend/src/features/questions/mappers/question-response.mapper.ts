import type { QuestionResponseDto } from "@/api/generated/models";
import type {
  AssetRequest,
  Question,
  QuestionCoverImage,
  QuestionPrimaryAsset,
} from "@/types";
import { getMediaUrl } from "@/lib/api/media-url";

const toAsset = (
  asset: QuestionResponseDto["primaryAsset"],
): QuestionPrimaryAsset | null | undefined =>
  asset === null
    ? null
    : asset
      ? { ...asset, url: getMediaUrl(asset.url) }
      : undefined;

const toCover = (
  asset: QuestionResponseDto["coverImage"],
): QuestionCoverImage | null | undefined =>
  asset === null
    ? null
    : asset
      ? { ...asset, type: "image", url: getMediaUrl(asset.url) }
      : undefined;

function toAssetRequest(value: unknown): AssetRequest | null | undefined {
  if (value === null) return null;
  if (!value || typeof value !== "object" || !("type" in value))
    return undefined;
  const type = value.type;
  if (
    type !== "text" &&
    type !== "image" &&
    type !== "audio" &&
    type !== "quote" &&
    type !== "emoji" &&
    type !== "timeline" &&
    type !== "gif"
  )
    return undefined;
  return { ...value, type };
}

export function toQuestion(dto: QuestionResponseDto): Question {
  return {
    id: dto.id || dto._id,
    _id: dto._id,
    categoryId: dto.categoryId || dto.category || "",
    category: dto.category,
    question: dto.question,
    answer: dto.answer || dto.correctAnswer || "",
    correctAnswer: dto.correctAnswer || dto.answer,
    wrongAnswers: dto.wrongAnswers,
    explanation: dto.explanation,
    difficulty: dto.difficulty,
    points: dto.points || dto.score || 200,
    score: dto.score,
    gameMode: dto.gameMode,
    type:
      dto.type === "image" ||
      dto.type === "audio" ||
      dto.type === "video" ||
      dto.type === "gif"
        ? dto.type
        : "text",
    primaryAsset: toAsset(dto.primaryAsset),
    coverImage: toCover(dto.coverImage),
    primaryAssetRequest: toAssetRequest(dto.primaryAssetRequest),
    coverImageRequest: toAssetRequest(dto.coverImageRequest),
    coverImageStatus: dto.coverImageStatus,
    coverImageFailureReason: dto.coverImageFailureReason,
    mediaUrl: dto.mediaUrl ? getMediaUrl(dto.mediaUrl) : undefined,
    assetStatus: dto.assetStatus,
    assetFailureReason: dto.assetFailureReason,
    assetFailureStep: dto.assetFailureStep,
    assetFailureDiagnostics: dto.assetFailureDiagnostics,
    gameplayMetadata: dto.gameplayMetadata,
    aiMetadata: dto.aiMetadata,
    metadata: dto.metadata,
    qualityScore: dto.qualityScore,
    issues: dto.issues,
    status: dto.status,
    source: dto.source,
    isFreeGameQuestion: dto.isFreeGameQuestion ?? false,
    createdAt: dto.createdAt || "",
    updatedAt: dto.updatedAt || "",
  };
}

export const toQuestions = (questions: QuestionResponseDto[]): Question[] =>
  questions.map(toQuestion);
