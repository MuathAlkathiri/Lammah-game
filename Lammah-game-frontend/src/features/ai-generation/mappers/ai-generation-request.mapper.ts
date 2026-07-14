import type {
  GenerateReviewedQuestionsDto,
  SaveReviewedDraftsDto,
} from "@/api/generated/models";
import type {
  GenerateReviewedInput,
  ReviewedQuestionDraft,
} from "../types/ai-generation.types";

export function toGenerateReviewedRequest(
  input: GenerateReviewedInput,
): GenerateReviewedQuestionsDto {
  return {
    ...(input.categoryId ? { categoryId: input.categoryId } : {}),
    ...(input.catalogName?.trim()
      ? { catalogName: input.catalogName.trim() }
      : {}),
    ...(input.categoryName?.trim()
      ? { categoryName: input.categoryName.trim() }
      : {}),
    count: input.count ?? 2,
    difficulty: input.difficulty ?? "medium",
    language: input.language ?? "ar",
  };
}

export function toSaveReviewedDraftsRequest(
  drafts: ReviewedQuestionDraft[],
  categoryId: string,
  catalogId?: string,
): SaveReviewedDraftsDto {
  return {
    categoryId,
    ...(catalogId ? { catalogId } : {}),
    drafts: drafts.map((draft) => ({ ...draft })),
  };
}
