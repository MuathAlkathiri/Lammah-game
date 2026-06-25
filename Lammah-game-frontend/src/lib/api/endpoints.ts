import apiClient from './client';
import axios from 'axios';
import {
  AuthResponse,
  Category,
  CreateGamePayload,
  Game,
  LoginPayload,
  Question,
  RegisterPayload,
  SubscriptionUpdatePayload,
  User,
  ApiResponse,
  ApiListResponse,
} from '@/types';

const unwrap = async <T>(request: Promise<{ data: T }>) => {
  const response = await request;
  return response.data;
};

export const authApi = {
  register: async (data: RegisterPayload) => {
    try {
      return await unwrap(apiClient.post<ApiResponse<User>>('/auth/register', data));
    } catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== 400) {
        throw error;
      }

      return unwrap(apiClient.post<ApiResponse<User>>('/auth/register', {
        name: data.fullName,
        email: data.email,
        password: data.password,
      }));
    }
  },
  login: (data: LoginPayload) =>
    unwrap(apiClient.post<AuthResponse>('/auth/login', data)),
  me: () => unwrap(apiClient.get<User>('/auth/me')),
};

// Categories API
export const categoriesApi = {
  list: () => unwrap(apiClient.get<ApiListResponse<Category>>('/categories')),
  get: (id: string) => unwrap(apiClient.get<ApiResponse<Category>>(`/categories/${id}`)),
  create: (data: Partial<Category>) =>
    unwrap(apiClient.post<ApiResponse<Category>>('/categories', data)),
  update: (id: string, data: Partial<Category>) =>
    unwrap(apiClient.patch<ApiResponse<Category>>(`/categories/${id}`, data)),
  delete: (id: string) => unwrap(apiClient.delete(`/categories/${id}`)),
};

// Questions API
export const questionsApi = {
  list: () => unwrap(apiClient.get<ApiListResponse<Question>>('/questions')),
  get: (id: string) => unwrap(apiClient.get<ApiResponse<Question>>(`/questions/${id}`)),
  create: (data: Partial<Question>) =>
    unwrap(apiClient.post<ApiResponse<Question>>('/questions', data)),
  update: (id: string, data: Partial<Question>) =>
    unwrap(apiClient.patch<ApiResponse<Question>>(`/questions/${id}`, data)),
  delete: (id: string) => unwrap(apiClient.delete(`/questions/${id}`)),
  updateStatus: (id: string, status: Question['status']) =>
    unwrap(apiClient.patch<ApiResponse<Question>>(`/questions/${id}`, { status })),
};

// Games API
export const gamesApi = {
  list: () => unwrap(apiClient.get<ApiListResponse<Game>>('/games')),
  get: (id: string) => unwrap(apiClient.get<ApiResponse<Game>>(`/games/${id}`)),
  create: (data: CreateGamePayload) => unwrap(apiClient.post<ApiResponse<Game>>('/games', data)),
  update: (id: string, data: Partial<Game>) =>
    unwrap(apiClient.patch<ApiResponse<Game>>(`/games/${id}`, data)),
  
  // Game play actions
  revealAnswer: (gameId: string, questionId: string) =>
    unwrap(apiClient.post(`/games/${gameId}/reveal-answer`, { questionId })),
  awardPoints: (gameId: string, questionId: string, teamIndex: 0 | 1) =>
    unwrap(apiClient.post(`/games/${gameId}/award-points`, { questionId, teamIndex })),
  skipQuestion: (gameId: string, questionId: string) =>
    unwrap(apiClient.post(`/games/${gameId}/skip-question`, { questionId })),
};

// AI Agent API
export const aiAgentApi = {
  generateQuestions: (categoryId: string, count?: number) =>
    unwrap(apiClient.post<ApiResponse<Question[]>>('/ai-agent/generate-questions', {
      categoryId,
      count: count || 10,
    })),
};

export const subscriptionsApi = {
  users: () => unwrap(apiClient.get<ApiListResponse<User>>('/users')),
  updateUser: (data: SubscriptionUpdatePayload) =>
    unwrap(apiClient.patch<ApiResponse<User>>(`/subscriptions/users/${data.userId}`, {
      subscriptionStatus: data.subscriptionStatus,
      subscriptionExpiresAt: data.subscriptionExpiresAt || null,
    })),
};
