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
  path?: string;
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

export interface CategoryAiConfig {
  knowledgeFile?: string;
  temperature?: number;
  preferredQuestionTypes?: string[];
  avoidTopics?: string[];
  extraInstructions?: string;
}

export type GameplayQuestionType =
  "text" | "image" | "audio" | "quote" | "emoji" | "timeline";
export type GameMode =
  | "trivia"
  | "identifyCharacter"
  | "identifyVoice"
  | "identifyImage"
  | "completeQuote"
  | "timeline"
  | "emojiPuzzle"
  | "identifySong"
  | "identifySinger"
  | "identifyMusicIntro";

export interface CategoryGameplayConfig {
  gameModes?: Partial<Record<GameMode, number>>;
  /** Legacy field. Prefer gameModes for new categories. */
  questionTypes?: Partial<Record<GameplayQuestionType, number>>;
  supportedAssetTypes?: GameplayQuestionType[];
  preferredDifficultyMix?: Partial<Record<QuestionDifficulty, number>>;
  maxAudioDuration?: number;
  imageRevealAllowed?: boolean;
  allowMultipleAssets?: boolean;
  musicConfig?: {
    allowedRegions?: string[];
    allowedLanguages?: string[];
    releaseYearFrom?: number;
    releaseYearTo?: number;
    maxPreviewDuration?: number;
  };
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
  aiConfig?: CategoryAiConfig;
  gameplayConfig?: CategoryGameplayConfig;
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
  aiConfig?: CategoryAiConfig;
  gameplayConfig?: CategoryGameplayConfig;
  bannerFile?: File;
}

// Question types
export type QuestionType = "text" | "image" | "audio" | "video" | "gif";
export type DraftAssetType =
  "text" | "image" | "audio" | "quote" | "emoji" | "timeline" | "gif";
export type PrimaryAssetType = "audio" | "image" | "video" | "gif";
export type AssetStatus = "NOT_REQUIRED" | "PENDING" | "READY" | "FAILED";
export type QuestionDifficulty = "easy" | "medium" | "hard";
export type QuestionStatus =
  "draft" | "approved" | "published" | "archived" | "rejected";
export type QuestionSource = "manual" | "ai" | "imported" | "music";

export interface AssetRequest {
  type: DraftAssetType;
  assetType?: DraftAssetType;
  provider?: string;
  query?: string;
  entity?: string;
  franchise?: string;
  language?: string;
  originalName?: string;
  localizedName?: string;
  englishTitle?: string;
  arabicTitle?: string;
  context?: string;
  duration?: number;
  speaker?: string;
  [key: string]: unknown;
}

export interface DraftAsset {
  localPath: string;
  url: string;
  duration?: number;
  source: string;
  sourceUrl?: string;
  searchQuery?: string;
  provider: string;
  type: DraftAssetType;
  metadata?: Record<string, unknown>;
}

export interface QuestionPrimaryAsset {
  type: PrimaryAssetType;
  url: string;
  source: string;
  sourceUrl?: string;
  searchQuery?: string;
  provider?: string;
  localPath?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface QuestionCoverImage {
  type: "image";
  url: string;
  source: string;
  sourceUrl?: string;
  provider?: string;
  localPath?: string;
  metadata?: Record<string, unknown>;
}

export interface Question {
  id: string;
  _id?: string;
  categoryId: string;
  catalogId?: string | Catalog | null;
  category?: Category | string;
  question: string;
  answer: string;
  correctAnswer?: string;
  wrongAnswers?: string[];
  explanation?: string;
  difficulty: QuestionDifficulty;
  points: number; // 200, 400, 600
  score?: number; // Future name for points
  gameMode?: GameMode;
  type: QuestionType;
  primaryAsset?: QuestionPrimaryAsset | null;
  coverImage?: QuestionCoverImage | null;
  primaryAssetRequest?: AssetRequest | null;
  coverImageRequest?: AssetRequest | null;
  coverImageStatus?: AssetStatus;
  coverImageFailureReason?: string;
  mediaUrl?: string;
  mediaKey?: string;
  assetStatus?: AssetStatus;
  asset?: DraftAsset | null;
  assetFailureReason?: string;
  assetFailureStep?: string;
  assetFailureDiagnostics?: Record<string, unknown>;
  qualityScore?: number;
  issues?: string[];
  gameplayMetadata?: Record<string, unknown>;
  aiMetadata?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  status: QuestionStatus;
  source: QuestionSource;
  createdBy?: string | User;
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
