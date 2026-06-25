'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi, questionsApi, gamesApi, aiAgentApi, subscriptionsApi } from '@/lib/api/endpoints';
import { Category, Question, CreateGamePayload, SubscriptionUpdatePayload } from '@/types';

// Categories hooks
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  });
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: ['categories', id],
    queryFn: () => categoriesApi.get(id),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Category>) => categoriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateCategory(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Category>) => categoriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories', id] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

// Questions hooks
export function useQuestions() {
  return useQuery({
    queryKey: ['questions'],
    queryFn: () => questionsApi.list(),
  });
}

export function useQuestion(id: string) {
  return useQuery({
    queryKey: ['questions', id],
    queryFn: () => questionsApi.get(id),
  });
}

export function useCreateQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Question>) => questionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });
}

export function useUpdateQuestion(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Question>) => questionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['questions', id] });
    },
  });
}

export function usePatchQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; data: Partial<Question> }) =>
      questionsApi.update(params.id, params.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });
}

export function useUpdateQuestionStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; status: Question['status'] }) =>
      questionsApi.updateStatus(params.id, params.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => questionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });
}

// Games hooks
export function useGames() {
  return useQuery({
    queryKey: ['games'],
    queryFn: () => gamesApi.list(),
  });
}

export function useGame(id: string) {
  return useQuery({
    queryKey: ['games', id],
    queryFn: () => gamesApi.get(id),
  });
}

export function useCreateGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGamePayload) => gamesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
    },
  });
}

export function useRevealAnswer(gameId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questionId: string) => gamesApi.revealAnswer(gameId, questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games', gameId] });
    },
  });
}

export function useAwardPoints(gameId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { questionId: string; teamIndex: 0 | 1 }) =>
      gamesApi.awardPoints(gameId, params.questionId, params.teamIndex),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games', gameId] });
    },
  });
}

export function useSkipQuestion(gameId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questionId: string) => gamesApi.skipQuestion(gameId, questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games', gameId] });
    },
  });
}

// AI Agent hooks
export function useGenerateQuestions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { categoryId: string; count?: number }) =>
      aiAgentApi.generateQuestions(params.categoryId, params.count),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => subscriptionsApi.users(),
    retry: false,
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SubscriptionUpdatePayload) => subscriptionsApi.updateUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
