export type UserRole = "admin" | "user";
export type SubscriptionStatus = "none" | "active" | "expired";

export interface User {
  id: string;
  _id?: string;
  fullName: string;
  email: string;
  role: UserRole;
  freeGamesUsed: number;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  fullName: string;
}

// Category types
export interface CategoryBanner {
  filename: string;
  path: string;
  url: string;
  mimetype: string;
  size: number;
}

export interface LocalizedText {
  ar: string;
  en: string;
}

export interface Catalog {
  id: string;
  _id?: string;
  name: LocalizedText;
  description?: LocalizedText;
  slug: string;
  banner?: CategoryBanner;
  icon?: string;
  isActive: boolean;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogPayload {
  name?: Partial<LocalizedText>;
  description?: Partial<LocalizedText>;
  slug?: string;
  icon?: string;
  isActive?: boolean;
  sortOrder?: number;
  bannerFile?: File;
}

export interface Category {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  description?: string;
  catalogId?: Catalog | string | null;
  catalog?: Catalog | null;
  banner?: CategoryBanner;
  isActive: boolean;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryPayload {
  name?: string;
  slug?: string;
  description?: string;
  catalogId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  bannerFile?: File;
}

// Question types
export type QuestionType = "text" | "image" | "audio" | "video";
export type QuestionDifficulty = "easy" | "medium" | "hard";
export type QuestionStatus = "draft" | "approved" | "rejected";
export type QuestionSource = "manual" | "ai";

export interface Question {
  id: string;
  _id?: string;
  categoryId: string;
  category?: Category | string;
  question: string;
  answer: string;
  explanation?: string;
  difficulty: QuestionDifficulty;
  points: number; // 200, 400, 600
  type: QuestionType;
  mediaUrl?: string;
  status: QuestionStatus;
  source: QuestionSource;
  isFreeGameQuestion: boolean;
  createdAt: string;
  updatedAt: string;
}

// Team types
export interface Team {
  id: string;
  _id?: string;
  name: string;
  members: string[];
  score: number;
}

// Board Question types
export interface BoardQuestion {
  id: string;
  _id?: string;
  categoryId: string;
  points: number;
  answered: boolean;
  questionId?: string;
  question?: Question;
  category?: Category;
}

// Game types
export type GameStatus = "setup" | "in_progress" | "finished";

export interface Game {
  id: string;
  _id?: string;
  name: string;
  teamA?: Team;
  teamB?: Team;
  teams?: Team[];
  categories: Category[];
  board: BoardQuestion[][];
  currentTeamTurn: "A" | "B";
  currentTeamIndex?: 0 | 1;
  currentQuestion?: Question;
  status: GameStatus;
  winner?: "A" | "B" | "draw";
  createdAt: string;
  updatedAt: string;
}

export interface CreateGamePayload {
  name: string;
  teams: Array<{
    name: string;
    members: string[];
  }>;
  categoryIds: string[];
}

export interface SubscriptionUpdatePayload {
  userId: string;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt?: string;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiListResponse<T> {
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
}
