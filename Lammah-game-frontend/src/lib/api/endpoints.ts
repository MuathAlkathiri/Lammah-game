import apiClient from "./client";
import axios from "axios";
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
} from "@/types";

type ApiEnvelope<T> = {
  data: T;
  statusCode?: number;
  message?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export function normalizeApiData<T>(response: unknown): T {
  let payload = response;

  if (isRecord(payload) && "data" in payload) {
    payload = payload.data;
  }

  if (isRecord(payload) && "data" in payload) {
    payload = payload.data;
  }

  return payload as T;
}

const unwrap = async <T>(request: Promise<unknown>) => {
  const response = await request;
  return normalizeApiData<T>(response);
};

export const authApi = {
  register: async (data: RegisterPayload) => {
    try {
      return await unwrap<User>(
        apiClient.post<ApiResponse<User> | ApiEnvelope<User>>(
          "/auth/register",
          data,
        ),
      );
    } catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== 400) {
        throw error;
      }

      return unwrap<User>(
        apiClient.post<ApiResponse<User> | ApiEnvelope<User>>(
          "/auth/register",
          {
            name: data.fullName,
            email: data.email,
            password: data.password,
          },
        ),
      );
    }
  },
  login: (data: LoginPayload) =>
    unwrap<AuthResponse>(
      apiClient.post<AuthResponse | ApiEnvelope<AuthResponse>>(
        "/auth/login",
        data,
      ),
    ),
  me: () => unwrap<User>(apiClient.get<User | ApiEnvelope<User>>("/auth/me")),
};

// Categories API
export const categoriesApi = {
  list: () =>
    unwrap<Category[]>(
      apiClient.get<Category[] | ApiListResponse<Category>>("/categories"),
    ),
  get: (id: string) =>
    unwrap<Category>(
      apiClient.get<Category | ApiResponse<Category>>(`/categories/${id}`),
    ),
  create: (data: Partial<Category>) =>
    unwrap<Category>(
      apiClient.post<Category | ApiResponse<Category>>("/categories", data),
    ),
  update: (id: string, data: Partial<Category>) =>
    unwrap<Category>(
      apiClient.patch<Category | ApiResponse<Category>>(
        `/categories/${id}`,
        data,
      ),
    ),
  delete: (id: string) =>
    unwrap<unknown>(apiClient.delete(`/categories/${id}`)),
};

// Questions API
export const questionsApi = {
  list: () =>
    unwrap<Question[]>(
      apiClient.get<Question[] | ApiListResponse<Question>>("/questions"),
    ),
  get: (id: string) =>
    unwrap<Question>(
      apiClient.get<Question | ApiResponse<Question>>(`/questions/${id}`),
    ),
  create: (data: Partial<Question>) =>
    unwrap<Question>(
      apiClient.post<Question | ApiResponse<Question>>("/questions", data),
    ),
  update: (id: string, data: Partial<Question>) =>
    unwrap<Question>(
      apiClient.patch<Question | ApiResponse<Question>>(
        `/questions/${id}`,
        data,
      ),
    ),
  delete: (id: string) => unwrap<unknown>(apiClient.delete(`/questions/${id}`)),
  updateStatus: (id: string, status: Question["status"]) =>
    unwrap<Question>(
      apiClient.patch<Question | ApiResponse<Question>>(`/questions/${id}`, {
        status,
      }),
    ),
};

export const musicTracksApi = {
  upload: (data: FormData) =>
    unwrap<unknown>(
      apiClient.post("/admin/music-tracks/upload", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }),
    ),
};

// Games API
export const gamesApi = {
  list: () =>
    unwrap<Game[]>(apiClient.get<Game[] | ApiListResponse<Game>>("/games")),
  get: (id: string) =>
    unwrap<Game>(apiClient.get<Game | ApiResponse<Game>>(`/games/${id}`)),
  create: (data: CreateGamePayload) =>
    unwrap<Game>(apiClient.post<Game | ApiResponse<Game>>("/games", data)),
  update: (id: string, data: Partial<Game>) =>
    unwrap<Game>(
      apiClient.patch<Game | ApiResponse<Game>>(`/games/${id}`, data),
    ),

  // Game play actions
  revealAnswer: (gameId: string, questionId: string) =>
    unwrap<unknown>(
      apiClient.post(`/games/${gameId}/reveal-answer`, { questionId }),
    ),
  awardPoints: (gameId: string, questionId: string, teamIndex: 0 | 1) =>
    unwrap<unknown>(
      apiClient.post(`/games/${gameId}/award-points`, {
        questionId,
        teamIndex,
      }),
    ),
  skipQuestion: (gameId: string, questionId: string) =>
    unwrap<unknown>(
      apiClient.post(`/games/${gameId}/skip-question`, { questionId }),
    ),
};

// AI Agent API
export const aiAgentApi = {
  generateQuestions: (categoryId: string, count?: number) =>
    unwrap<Question[]>(
      apiClient.post<Question[] | ApiResponse<Question[]>>(
        "/ai-agent/generate-questions",
        {
          categoryId,
          count: count || 10,
        },
      ),
    ),
};

export const subscriptionsApi = {
  users: () =>
    unwrap<User[]>(apiClient.get<User[] | ApiListResponse<User>>("/users")),
  updateUser: (data: SubscriptionUpdatePayload) =>
    unwrap<User>(
      apiClient.patch<User | ApiResponse<User>>(
        `/subscriptions/users/${data.userId}`,
        {
          subscriptionStatus: data.subscriptionStatus,
          subscriptionExpiresAt: data.subscriptionExpiresAt || null,
        },
      ),
    ),
};
