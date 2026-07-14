"use client";

import type { AxiosError } from "axios";
import { useQueryClient } from "@tanstack/react-query";
import {
  useQuestionsCreate,
  useQuestionsDelete,
  useQuestionsUpdate,
} from "@/api/generated/questions/questions";
import {
  useAdminQuestionsGetById,
  useAdminQuestionsList,
  useQuestionsBulkAction,
  useQuestionsListAiGenerated,
  useQuestionsRetryCoverImage,
  useQuestionsRetryPrimaryAsset,
} from "@/api/generated/admin-questions/admin-questions";
import type { ErrorResponseDto } from "@/api/generated/models";
import type { Question } from "@/types";
import {
  toQuestionFilters,
  type QuestionFilterState,
} from "../mappers/question-filter.mapper";
import {
  toCreateQuestionRequest,
  toUpdateQuestionRequest,
} from "../mappers/question-request.mapper";
import { toQuestion, toQuestions } from "../mappers/question-response.mapper";

type QuestionApiError = AxiosError<ErrorResponseDto>;
export const questionKeys = {
  all: ["questions"] as const,
  detail: (id: string) => ["questions", id] as const,
  aiGenerated: (filters: QuestionFilterState) =>
    ["ai-generation", "reviewed", filters] as const,
};

const useInvalidateQuestions = () => {
  const client = useQueryClient();
  return (id?: string) => {
    client.invalidateQueries({ queryKey: questionKeys.all });
    client.invalidateQueries({ queryKey: ["ai-generation"] });
    if (id) client.invalidateQueries({ queryKey: questionKeys.detail(id) });
  };
};

export const useQuestions = () =>
  useAdminQuestionsList({
    query: { queryKey: questionKeys.all, select: (r) => toQuestions(r.data) },
  });
export const useQuestion = (id: string) =>
  useAdminQuestionsGetById(id, {
    query: {
      queryKey: questionKeys.detail(id),
      enabled: Boolean(id),
      select: (r) => toQuestion(r.data),
    },
  });
export const useAiGeneratedQuestions = (filters: QuestionFilterState) =>
  useQuestionsListAiGenerated(toQuestionFilters(filters), {
    query: {
      queryKey: questionKeys.aiGenerated(filters),
      select: (r) => toQuestions(r.data),
    },
  });

export function useCreateQuestion() {
  const invalidate = useInvalidateQuestions();
  const mutation = useQuestionsCreate<QuestionApiError>({
    mutation: { onSuccess: () => invalidate() },
  });
  return {
    ...mutation,
    mutateAsync: (data: Partial<Question>) =>
      mutation
        .mutateAsync({ data: toCreateQuestionRequest(data) })
        .then((r) => toQuestion(r.data)),
  };
}
export function usePatchQuestion() {
  const invalidate = useInvalidateQuestions();
  const mutation = useQuestionsUpdate<QuestionApiError>({
    mutation: { onSuccess: (_, variables) => invalidate(variables.id) },
  });
  return {
    ...mutation,
    mutate: (
      input: { id: string; data: Partial<Question> },
      options?: Parameters<typeof mutation.mutate>[1],
    ) =>
      mutation.mutate(
        { id: input.id, data: toUpdateQuestionRequest(input.data) },
        options,
      ),
    mutateAsync: (input: { id: string; data: Partial<Question> }) =>
      mutation
        .mutateAsync({
          id: input.id,
          data: toUpdateQuestionRequest(input.data),
        })
        .then((r) => toQuestion(r.data)),
  };
}
export function useUpdateQuestion(id: string) {
  const patch = usePatchQuestion();
  return {
    ...patch,
    mutateAsync: (data: Partial<Question>) => patch.mutateAsync({ id, data }),
  };
}
export function useUpdateQuestionStatus() {
  const patch = usePatchQuestion();
  return {
    ...patch,
    mutate: (
      input: { id: string; status: Question["status"] },
      options?: Parameters<typeof patch.mutate>[1],
    ) =>
      patch.mutate({ id: input.id, data: { status: input.status } }, options),
    mutateAsync: (input: { id: string; status: Question["status"] }) =>
      patch.mutateAsync({ id: input.id, data: { status: input.status } }),
  };
}
export function useDeleteQuestion() {
  const invalidate = useInvalidateQuestions();
  const mutation = useQuestionsDelete<QuestionApiError>({
    mutation: { onSuccess: () => invalidate() },
  });
  return {
    ...mutation,
    mutate: (id: string, options?: Parameters<typeof mutation.mutate>[1]) =>
      mutation.mutate({ id }, options),
    mutateAsync: (id: string) => mutation.mutateAsync({ id }),
  };
}
export function useBulkQuestionAction() {
  const invalidate = useInvalidateQuestions();
  const mutation = useQuestionsBulkAction<QuestionApiError>({
    mutation: { onSuccess: () => invalidate() },
  });
  return {
    ...mutation,
    mutate: (
      data: { ids: string[]; action: "approve" | "reject" | "delete" },
      options?: Parameters<typeof mutation.mutate>[1],
    ) => mutation.mutate({ data }, options),
    mutateAsync: (data: {
      ids: string[];
      action: "approve" | "reject" | "delete";
    }) => mutation.mutateAsync({ data }),
  };
}
export function useRetryQuestionAsset() {
  const invalidate = useInvalidateQuestions();
  const primary = useQuestionsRetryPrimaryAsset<QuestionApiError>({
    mutation: { onSuccess: (_, variables) => invalidate(variables.id) },
  });
  const cover = useQuestionsRetryCoverImage<QuestionApiError>({
    mutation: { onSuccess: (_, variables) => invalidate(variables.id) },
  });
  return {
    isPending: primary.isPending || cover.isPending,
    mutate: (
      input: { id: string; target: "primary" | "cover" },
      options?: { onSuccess?: (question: Question) => void },
    ) => {
      const selected = input.target === "primary" ? primary : cover;
      selected.mutate(
        { id: input.id },
        { onSuccess: (r) => options?.onSuccess?.(toQuestion(r.data)) },
      );
    },
    mutateAsync: async (input: { id: string; target: "primary" | "cover" }) =>
      toQuestion(
        (
          await (input.target === "primary"
            ? primary.mutateAsync({ id: input.id })
            : cover.mutateAsync({ id: input.id }))
        ).data,
      ),
  };
}
