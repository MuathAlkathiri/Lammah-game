import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { randomUUID } from 'crypto';
import { mkdir, rm } from 'fs/promises';
import { Types } from 'mongoose';
import { join } from 'path';
import { promisify } from 'util';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';
import { GenerateReviewedQuestionsDto } from './dto/generate-reviewed-questions.dto';
import { SaveReviewedDraftsDto } from './dto/save-reviewed-drafts.dto';
import { CategoriesService } from '../categories/categories.service';
import {
  CategoryAiConfig,
  CategoryGameplayConfig,
} from '../categories/schemas/category.schema';
import { Question } from '../questions/schemas/question.schema';
import {
  GeneratedQuestionsArraySchema,
  GeneratedQuestion,
} from './schemas/generated-question.schema';
import {
  KnowledgeLoaderService,
  LoadedKnowledge,
} from './services/knowledge-loader.service';
import { PromptBuilderService } from './services/prompt-builder.service';
import { AssetService } from './application/asset.service';
import {
  AssetMetadata,
  AssetRequest,
  AssetStatus,
  GameMode,
  QuestionAssetType,
} from './contracts/asset-provider.interface';
import { GameplayValidatorService } from './services/gameplay-validator.service';
import { WrongAnswerRepairService } from './services/wrong-answer-repair.service';
import { ContentOrchestratorService } from './application/content-orchestrator.service';
import { AgentTrace } from './agents/llm-agent.interface';
import { QuestionRepository } from '../questions/persistence/question.repository';

const execFileAsync = promisify(execFile);

type DraftGeneratedQuestion = GeneratedQuestion & {
  mediaUrl?: string | null;
  mediaKey?: string;
  spotifyTrackId?: string;
  spotifyArtist?: string;
  spotifyAlbumName?: string;
  spotifyAlbumImageUrl?: string;
  spotifyUrl?: string;
  hasPreviewAudio?: boolean;
};

type ReviewedQuestionDraft = {
  question: string;
  correctAnswer: string;
  wrongAnswers: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  gameMode: GameMode;
  type: QuestionAssetType;
  assetRequest: AssetRequest | null;
  assetStatus: AssetStatus;
  asset: AssetMetadata | null;
  primaryAssetRequest: AssetRequest | null;
  primaryAssetStatus: AssetStatus;
  primaryAsset: AssetMetadata | null;
  coverImageRequest: AssetRequest | null;
  coverImageStatus: AssetStatus;
  coverImage: AssetMetadata | null;
  coverImageFailureReason?: string | null;
  assetFailureReason?: string;
  assetFailureStep?: string;
  assetFailureDiagnostics?: Record<string, unknown> | Record<string, unknown>[];
  wasGameplayAutoFixed?: boolean;
  gameplayFixReason?: string;
  explanation: string;
  qualityScore: number;
  issues: string[];
  agentTrace?: AgentTrace[];
};

type ReviewedGenerationContext = {
  catalogName: string;
  categoryName: string;
  difficulty: 'easy' | 'medium' | 'hard';
  count: number;
  language: 'ar';
  aiConfig?: CategoryAiConfig;
  gameplayConfig?: CategoryGameplayConfig;
  source: 'categoryId' | 'manualNames';
  loadedKnowledge: LoadedKnowledge;
};

interface ChatCompletionResponse {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
  error?: {
    message?: string;
  };
}

@Injectable()
export class AiAgentService {
  private static readonly DEFAULT_QUESTION_COUNT = 2;
  private static readonly DEFAULT_REQUEST_TIMEOUT_MS = 120000;
  private static readonly DEFAULT_MAX_TOKENS = 4096;
  private static readonly DEFAULT_TTS_VOICE = 'Majed';

  private readonly aiProvider: string;
  private readonly openRouterApiKey: string;
  private readonly openRouterModel: string;
  private readonly lmStudioBaseUrl: string;
  private readonly lmStudioModel: string;
  private readonly lmStudioApiKey: string;
  private readonly aiRequestTimeoutMs: number;
  private readonly aiMaxTokens: number;
  private readonly aiEnableRewrite: boolean;
  private readonly appBaseUrl: string;
  private readonly aiAudioVoice: string;

  constructor(
    private configService: ConfigService,
    private categoriesService: CategoriesService,
    private knowledgeLoader: KnowledgeLoaderService,
    private promptBuilder: PromptBuilderService,
    private assetService: AssetService,
    private gameplayValidator: GameplayValidatorService,
    private wrongAnswerRepair: WrongAnswerRepairService,
    private contentOrchestrator: ContentOrchestratorService,
    private readonly questionRepository: QuestionRepository,
  ) {
    this.aiProvider =
      this.configService.get<string>('AI_PROVIDER')?.toLowerCase() ??
      'openrouter';

    if (!['openrouter', 'lmstudio'].includes(this.aiProvider)) {
      throw new Error(
        `Invalid AI_PROVIDER "${this.aiProvider}". Supported providers: openrouter, lmstudio`,
      );
    }

    this.openRouterApiKey =
      this.configService.get<string>('OPENROUTER_API_KEY') ?? '';
    this.openRouterModel =
      this.configService.get<string>('OPENROUTER_MODEL') ??
      'google/gemini-2.5-flash';
    this.lmStudioBaseUrl =
      this.configService.get<string>('LMSTUDIO_BASE_URL') ??
      'http://localhost:1234/v1';
    this.lmStudioModel =
      this.configService.get<string>('LMSTUDIO_MODEL') ?? 'gemma4';
    this.lmStudioApiKey =
      this.configService.get<string>('LMSTUDIO_API_KEY') ?? 'dummy';
    this.aiRequestTimeoutMs = this.getPositiveNumberConfig(
      'AI_REQUEST_TIMEOUT_MS',
      AiAgentService.DEFAULT_REQUEST_TIMEOUT_MS,
    );
    this.aiMaxTokens = this.getPositiveNumberConfig(
      'AI_MAX_TOKENS',
      AiAgentService.DEFAULT_MAX_TOKENS,
    );
    this.aiEnableRewrite = this.getBooleanConfig(
      'AI_ENABLE_REWRITE',
      this.aiProvider !== 'lmstudio',
    );
    this.appBaseUrl =
      this.configService.get<string>('APP_BASE_URL') ?? 'http://localhost:3000';
    this.aiAudioVoice =
      this.configService.get<string>('AI_AUDIO_VOICE') ??
      AiAgentService.DEFAULT_TTS_VOICE;

    if (this.aiProvider === 'openrouter' && !this.openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is not set');
    }
  }

  private getPositiveNumberConfig(key: string, defaultValue: number): number {
    const value = this.configService.get<string>(key);

    if (!value) {
      return defaultValue;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error(`${key} must be a positive number`);
    }

    return parsed;
  }

  private getBooleanConfig(key: string, defaultValue: boolean): boolean {
    const value = this.configService.get<string>(key);

    if (!value) {
      return defaultValue;
    }

    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }

  async generateQuestions(generateQuestionsDto: GenerateQuestionsDto) {
    const { categoryId, count = AiAgentService.DEFAULT_QUESTION_COUNT } =
      generateQuestionsDto;

    // Verify category exists
    const category =
      await this.categoriesService.findByIdForGeneration(categoryId);

    try {
      if (this.isSongsCategory(category.name)) {
        throw new BadRequestException(
          'Music questions must be created from admin-uploaded audio via /admin/music-tracks/upload.',
        );
      }

      const prompt = this.buildPrompt(category.name, count);
      const aiResponse = await this.callAiProvider(prompt);
      const parsedQuestions = this.parseAiResponse(aiResponse);
      const validatedQuestions = this.normalizeQuestionsForCategory(
        this.validateGeneratedQuestions(parsedQuestions, count),
        category.name,
      );

      const generatedCount = validatedQuestions.length;
      let rejectedCount = 0;
      let rewrittenCount = 0;

      const reviewedQuestions: DraftGeneratedQuestion[] = [];

      for (const question of validatedQuestions) {
        const review = this.reviewGeneratedQuestion(question);

        if (this.aiEnableRewrite && review.shouldRewrite) {
          rewrittenCount += 1;

          try {
            const rewritten = await this.rewriteQuestion(
              question,
              category.name,
            );
            const rewrittenValidated = this.validateGeneratedQuestions([
              rewritten,
            ]);
            reviewedQuestions.push(rewrittenValidated[0]);
          } catch (rewriteError) {
            rejectedCount += 1;
            console.log(
              `Question rewrite rejected: ${question.question} - ${rewriteError instanceof Error ? rewriteError.message : String(rewriteError)}`,
            );
          }
        } else {
          reviewedQuestions.push(question);
        }
      }

      const uniqueQuestions = await this.removeDuplicates(
        reviewedQuestions,
        categoryId,
      );
      rejectedCount += reviewedQuestions.length - uniqueQuestions.length;

      if (uniqueQuestions.length === 0) {
        throw new BadRequestException(
          'No valid questions were generated or all generated questions are duplicates',
        );
      }

      const savedQuestions = await this.saveDraftQuestions(
        uniqueQuestions,
        categoryId,
      );

      console.log(
        `AI generation summary for category ${category.name}: generated=${generatedCount}, rewritten=${rewrittenCount}, rejected=${rejectedCount}, saved=${savedQuestions.length}`,
      );

      return {
        message: 'Questions generated successfully',
        count: savedQuestions.length,
        data: savedQuestions,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error instanceof SyntaxError) {
        throw new BadRequestException('Invalid JSON response from AI');
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        `Failed to generate questions: ${errorMessage}`,
      );
    }
  }

  async generateReviewedQuestions(dto: GenerateReviewedQuestionsDto) {
    try {
      const context = await this.resolveReviewedGenerationContext(dto);
      const prompt = this.promptBuilder.buildReviewedQuestionsPrompt({
        catalogName: context.catalogName,
        categoryName: context.categoryName,
        difficulty: context.difficulty,
        count: context.count,
        language: context.language,
        knowledgeFile: context.loadedKnowledge.knowledgeFile,
        usedDefaultKnowledge: context.loadedKnowledge.usedDefaultKnowledge,
        knowledge: context.loadedKnowledge.knowledge,
        aiConfig: context.aiConfig,
        gameplayConfig: context.gameplayConfig,
      });
      const useMultiAgent =
        this.configService
          .get<string>('MULTI_AGENT_CONTENT_PIPELINE')
          ?.toLowerCase() === 'true';
      let aiResponse: string;
      if (useMultiAgent) {
        try {
          const orchestrated = await this.contentOrchestrator.execute(prompt, {
            knowledgeFile: context.loadedKnowledge.knowledgeFile,
            language: context.language,
            difficulty: context.difficulty,
            modelConfig: { temperature: context.aiConfig?.temperature },
          });
          aiResponse = JSON.stringify(orchestrated);
        } catch {
          aiResponse = await this.callAiProvider(
            prompt,
            context.aiConfig?.temperature,
          );
        }
      } else {
        aiResponse = await this.callAiProvider(
          prompt,
          context.aiConfig?.temperature,
        );
      }
      const questions = this.parseAndNormalizeReviewedResponse(
        aiResponse,
        context.difficulty,
      ).slice(0, context.count);
      const normalizedGameplayConfig =
        this.promptBuilder.normalizeGameplayConfig(context.gameplayConfig);
      const gameplayValidatedQuestions = questions.map((question) =>
        this.gameplayValidator.normalize(
          question,
          normalizedGameplayConfig.maxAudioDuration,
        ),
      );
      const repairedQuestions = await this.repairWrongAnswers(
        gameplayValidatedQuestions,
        context.categoryName,
      );
      const qualityValidatedQuestions = repairedQuestions.map(
        (question, index) =>
          this.validateReviewedQuestionQuality(question, index),
      );
      const questionsWithAssets = await this.processDraftAssets(
        qualityValidatedQuestions,
        context.gameplayConfig,
      );

      if (questionsWithAssets.length === 0) {
        throw new BadRequestException('AI did not return any question drafts');
      }

      return {
        message: 'Reviewed question drafts generated successfully',
        count: questionsWithAssets.length,
        meta: {
          knowledgeFile: context.loadedKnowledge.knowledgeFile,
          requestedKnowledgeFile: context.loadedKnowledge.requestedFile,
          usedDefaultKnowledge: context.loadedKnowledge.usedDefaultKnowledge,
          source: context.source,
          hasAiConfig: Boolean(context.aiConfig),
          hasGameplayConfig: Boolean(context.gameplayConfig),
          gameplayConfig: normalizedGameplayConfig,
          gameplayConfigUsed: true,
          gameModes: normalizedGameplayConfig.gameModes,
          gameplayValidatorUsed: true,
          multiAgentContentPipeline: useMultiAgent,
          providerSelection: 'assetService',
          imageProviders: ['wikimedia'],
          coverImagesRequested: questionsWithAssets.length,
          coverImagesReady: questionsWithAssets.filter(
            (question) => question.coverImageStatus === 'READY',
          ).length,
          coverImagesFailed: questionsWithAssets.filter(
            (question) => question.coverImageStatus === 'FAILED',
          ).length,
          wrongAnswerRepairUsed: repairedQuestions.some((question) =>
            question.issues.includes('wrongAnswers repaired'),
          ),
        },
        data: {
          questions: questionsWithAssets,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        `Failed to generate reviewed questions: ${errorMessage}`,
      );
    }
  }

  async saveReviewedDrafts(dto: SaveReviewedDraftsDto) {
    const category = await this.categoriesService.findByIdForGeneration(
      dto.categoryId,
    );
    const existing = await this.questionRepository.findQuestionTexts(
      dto.categoryId,
    );
    const normalizedExisting = new Set(
      existing.map((item) => this.normalizeDuplicateText(item.question)),
    );
    const savedQuestions: Question[] = [];
    const failures: Array<{ index: number; reason: string }> = [];

    for (const [index, raw] of dto.drafts.entries()) {
      try {
        const question = this.readString(raw.question);
        const correctAnswer =
          this.readString(raw.correctAnswer) || this.readString(raw.answer);
        if (!question) throw new Error('Missing question');
        if (!correctAnswer) throw new Error('Missing correctAnswer');
        const duplicateKey = this.normalizeDuplicateText(question);
        if (normalizedExisting.has(duplicateKey))
          throw new Error('Duplicate question in this category');
        const difficulty = ['easy', 'medium', 'hard'].includes(
          this.readString(raw.difficulty),
        )
          ? this.readString(raw.difficulty)
          : 'medium';
        const points =
          difficulty === 'easy' ? 200 : difficulty === 'hard' ? 600 : 400;
        const primaryAsset = (raw.primaryAsset ??
          raw.asset ??
          null) as AssetMetadata | null;
        const coverImage = (raw.coverImage ?? null) as AssetMetadata | null;
        const created = await this.questionRepository.create({
          question,
          correctAnswer,
          answer: correctAnswer,
          wrongAnswers: this.readStringArray(raw.wrongAnswers),
          explanation: this.readString(raw.explanation),
          difficulty,
          points,
          score: points,
          category: new Types.ObjectId(dto.categoryId),
          catalogId:
            dto.catalogId && Types.ObjectId.isValid(dto.catalogId)
              ? new Types.ObjectId(dto.catalogId)
              : this.resolveCatalogIdForDraft(category),
          gameMode: raw.gameMode,
          type: raw.type ?? primaryAsset?.type ?? 'text',
          primaryAsset,
          coverImage,
          mediaUrl: primaryAsset?.url,
          primaryAssetRequest: raw.primaryAssetRequest ?? raw.assetRequest,
          coverImageRequest: raw.coverImageRequest,
          assetStatus:
            raw.primaryAssetStatus ?? raw.assetStatus ?? 'NOT_REQUIRED',
          coverImageStatus:
            raw.coverImageStatus ?? (coverImage ? 'READY' : 'FAILED'),
          assetFailureReason: raw.assetFailureReason,
          assetFailureStep: raw.assetFailureStep,
          assetFailureDiagnostics: raw.assetFailureDiagnostics,
          coverImageFailureReason: raw.coverImageFailureReason,
          qualityScore: raw.qualityScore,
          issues: Array.isArray(raw.issues) ? raw.issues : [],
          gameplayMetadata: raw.gameplayMetadata ?? {},
          aiMetadata: {
            ...((raw.aiMetadata as object) ?? {}),
            savedFromReviewedGenerator: true,
            savedAt: new Date().toISOString(),
          },
          source: 'ai',
          status: 'draft',
          isFreeGameQuestion: false,
        });
        normalizedExisting.add(duplicateKey);
        savedQuestions.push(created);
      } catch (error) {
        failures.push({
          index,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return {
      savedCount: savedQuestions.length,
      failedCount: failures.length,
      savedQuestions,
      failures,
    };
  }

  private normalizeDuplicateText(value: string) {
    return value
      .toLocaleLowerCase('ar')
      .replace(/[\p{P}\p{S}]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private resolveCatalogIdForDraft(category: unknown) {
    const record = category as { catalogId?: unknown; catalog?: unknown };
    const value = record.catalogId ?? record.catalog;
    if (value instanceof Types.ObjectId) return value;
    if (typeof value === 'string' && Types.ObjectId.isValid(value))
      return new Types.ObjectId(value);
    if (value && typeof value === 'object' && '_id' in value)
      return (value as { _id: Types.ObjectId })._id;
    return undefined;
  }

  private async resolveReviewedGenerationContext(
    dto: GenerateReviewedQuestionsDto,
  ): Promise<ReviewedGenerationContext> {
    const difficulty = dto.difficulty ?? 'medium';
    const count = dto.count ?? AiAgentService.DEFAULT_QUESTION_COUNT;
    const language = dto.language ?? 'ar';

    if (dto.categoryId) {
      const category = await this.categoriesService.findByIdForGeneration(
        dto.categoryId,
      );
      const catalog = category.catalog;
      const catalogName = this.resolveCatalogName(catalog) || dto.catalogName;
      const categoryName = category.name;

      if (!catalogName) {
        throw new BadRequestException(
          'Category must have a catalog or catalogName must be provided',
        );
      }

      const inferredKnowledgeFile = this.knowledgeLoader.inferKnowledgeFile(
        this.resolveCatalogSlugOrName(catalog, catalogName),
        category.slug || categoryName,
      );
      const loadedKnowledge = await this.knowledgeLoader.load(
        category.aiConfig?.knowledgeFile || inferredKnowledgeFile,
      );

      return {
        catalogName,
        categoryName,
        difficulty,
        count,
        language,
        aiConfig: category.aiConfig,
        gameplayConfig: category.gameplayConfig,
        source: 'categoryId',
        loadedKnowledge,
      };
    }

    if (!dto.catalogName || !dto.categoryName) {
      throw new BadRequestException(
        'Either categoryId or both catalogName and categoryName are required',
      );
    }

    const inferredKnowledgeFile = this.knowledgeLoader.inferKnowledgeFile(
      dto.catalogName,
      dto.categoryName,
    );
    const loadedKnowledge = await this.knowledgeLoader.load(
      inferredKnowledgeFile,
    );

    return {
      catalogName: dto.catalogName,
      categoryName: dto.categoryName,
      difficulty,
      count,
      language,
      source: 'manualNames',
      loadedKnowledge,
    };
  }

  private async processDraftAssets(
    questions: ReviewedQuestionDraft[],
    gameplayConfig?: CategoryGameplayConfig,
  ): Promise<ReviewedQuestionDraft[]> {
    const normalizedGameplayConfig =
      this.promptBuilder.normalizeGameplayConfig(gameplayConfig);
    const supportedAssetTypes = new Set(
      normalizedGameplayConfig.supportedAssetTypes,
    );

    return Promise.all(
      questions.map(async (rawQuestion) => {
        const question = this.enforceGameplayConfigOnDraft(
          rawQuestion,
          supportedAssetTypes,
          normalizedGameplayConfig.maxAudioDuration,
        );

        // Gameplay validation still owns the legacy field, so it wins while both shapes coexist.
        const primaryRequest =
          question.assetRequest ?? question.primaryAssetRequest;
        const primaryResult =
          question.primaryAssetStatus === 'READY' && question.primaryAsset
            ? { assetStatus: 'READY' as const, asset: question.primaryAsset }
            : await this.assetService.process(primaryRequest ?? undefined);
        const coverResult =
          question.coverImageStatus === 'READY' && question.coverImage
            ? { assetStatus: 'READY' as const, asset: question.coverImage }
            : await this.assetService.process(
                question.coverImageRequest ?? undefined,
              );
        const primaryFailure =
          primaryResult.assetStatus === 'FAILED' ? primaryResult : null;
        const coverFailure =
          coverResult.assetStatus === 'FAILED' ? coverResult : null;
        return {
          ...question,
          primaryAssetRequest: primaryRequest,
          primaryAssetStatus: primaryResult.assetStatus,
          primaryAsset:
            primaryResult.assetStatus === 'READY' ? primaryResult.asset : null,
          coverImageStatus:
            coverResult.assetStatus === 'NOT_REQUIRED'
              ? 'FAILED'
              : coverResult.assetStatus,
          coverImage:
            coverResult.assetStatus === 'READY' ? coverResult.asset : null,
          coverImageFailureReason:
            coverFailure?.assetFailureReason ??
            (coverResult.assetStatus === 'NOT_REQUIRED'
              ? 'Cover image request is missing'
              : null),
          assetRequest: primaryRequest,
          assetStatus: primaryResult.assetStatus,
          asset:
            primaryResult.assetStatus === 'READY' ? primaryResult.asset : null,
          assetFailureReason: primaryFailure?.assetFailureReason,
          assetFailureStep: primaryFailure?.assetFailureStep,
          assetFailureDiagnostics: primaryFailure?.assetFailureDiagnostics,
        };
      }),
    );
  }

  private async repairWrongAnswers(
    questions: ReviewedQuestionDraft[],
    categoryName: string,
  ): Promise<ReviewedQuestionDraft[]> {
    return Promise.all(
      questions.map(async (question) => {
        if (question.wrongAnswers.length === 0) return question;
        const normalizedWrongAnswers =
          this.wrongAnswerRepair.normalizeWrongAnswers(
            question.correctAnswer,
            question.wrongAnswers,
          );

        if (
          !this.wrongAnswerRepair.needsRepair(
            question.correctAnswer,
            normalizedWrongAnswers,
          )
        ) {
          return {
            ...question,
            wrongAnswers: normalizedWrongAnswers,
          };
        }

        try {
          const repairPrompt = this.wrongAnswerRepair.buildRepairPrompt({
            categoryName,
            question: question.question,
            correctAnswer: question.correctAnswer,
            wrongAnswers: normalizedWrongAnswers,
          });
          const repairResponse = await this.callAiProvider(repairPrompt, 0.4);
          const repairedWrongAnswers =
            this.wrongAnswerRepair.normalizeWrongAnswers(
              question.correctAnswer,
              this.wrongAnswerRepair.parseRepairResponse(repairResponse),
            );

          if (repairedWrongAnswers.length !== 3) {
            throw new Error('Repair did not return exactly 3 usable answers');
          }

          return {
            ...question,
            wrongAnswers: repairedWrongAnswers,
            issues: Array.from(
              new Set([...question.issues, 'wrongAnswers repaired']),
            ),
          };
        } catch (error) {
          const repairError =
            error instanceof Error ? error.message : String(error);

          return {
            ...question,
            wrongAnswers: normalizedWrongAnswers,
            issues: Array.from(
              new Set([
                ...question.issues,
                'wrongAnswers must have exactly 3 items',
                `wrongAnswers repair failed: ${repairError}`,
              ]),
            ),
          };
        }
      }),
    );
  }

  private enforceGameplayConfigOnDraft(
    question: ReviewedQuestionDraft,
    supportedAssetTypes: Set<QuestionAssetType>,
    maxAudioDuration?: number,
  ): ReviewedQuestionDraft {
    if (!supportedAssetTypes.has(question.type)) {
      return {
        ...question,
        type: 'text',
        assetRequest: null,
        assetStatus: 'NOT_REQUIRED',
        asset: null,
        issues: Array.from(
          new Set([
            ...question.issues,
            `question type ${question.type} is not supported by gameplayConfig`,
          ]),
        ),
      };
    }

    if (
      question.type === 'audio' &&
      question.assetRequest &&
      maxAudioDuration
    ) {
      return {
        ...question,
        assetRequest: {
          ...question.assetRequest,
          duration: Math.min(
            maxAudioDuration,
            Number(question.assetRequest.duration) || maxAudioDuration,
          ),
        },
      };
    }

    return question;
  }

  private resolveCatalogName(catalog: unknown): string | undefined {
    if (!catalog || typeof catalog !== 'object') {
      return undefined;
    }

    const catalogRecord = catalog as Record<string, unknown>;
    const name = catalogRecord.name;

    if (typeof name === 'string') {
      return name;
    }

    if (name && typeof name === 'object') {
      const localizedName = name as Record<string, unknown>;
      return (
        this.readString(localizedName.ar) || this.readString(localizedName.en)
      );
    }

    return undefined;
  }

  private resolveCatalogSlugOrName(
    catalog: unknown,
    fallbackName: string,
  ): string {
    if (catalog && typeof catalog === 'object') {
      const slug = (catalog as Record<string, unknown>).slug;

      if (typeof slug === 'string' && slug.trim()) {
        return slug;
      }
    }

    return fallbackName;
  }

  private parseAndNormalizeReviewedResponse(
    response: string,
    difficulty: 'easy' | 'medium' | 'hard',
  ): ReviewedQuestionDraft[] {
    try {
      const parsed = JSON.parse(this.cleanAiJsonResponse(response)) as unknown;
      const rawQuestions = this.getReviewedQuestionsArray(parsed);

      return rawQuestions.map((question, index) =>
        this.normalizeReviewedQuestion(question, difficulty, index),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new BadRequestException(
        `Failed to parse reviewed AI response as JSON: ${errorMessage}`,
      );
    }
  }

  private getReviewedQuestionsArray(parsed: unknown): unknown[] {
    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as { questions?: unknown }).questions)
    ) {
      return (parsed as { questions: unknown[] }).questions;
    }

    throw new Error('Response must be an object with a questions array');
  }

  private normalizeReviewedQuestion(
    rawQuestion: unknown,
    requestedDifficulty: 'easy' | 'medium' | 'hard',
    index: number,
  ): ReviewedQuestionDraft {
    const raw =
      rawQuestion && typeof rawQuestion === 'object'
        ? (rawQuestion as Record<string, unknown>)
        : {};
    const issues = this.readStringArray(raw.issues);
    const question = this.readString(raw.question);
    const correctAnswer =
      this.readString(raw.correctAnswer) ||
      this.readString(raw.correct_answer) ||
      this.readString(raw.answer);
    const explanation = this.readString(raw.explanation);
    const qualityScore = this.normalizeQualityScore(raw.qualityScore, issues);
    const gameMode = this.normalizeGameMode(raw.gameMode, issues);
    const type = this.normalizeQuestionAssetType(raw.type, issues);
    const primaryAssetRequest = this.normalizeAssetRequest(
      raw.primaryAssetRequest ?? raw.assetRequest,
      type,
    );
    const assetRequest = primaryAssetRequest;
    const coverImageRequest = this.normalizeAssetRequest(
      raw.coverImageRequest,
      'image',
    );
    const rawPrimaryAsset = raw.primaryAsset ?? raw.asset;
    const primaryAsset =
      rawPrimaryAsset && typeof rawPrimaryAsset === 'object'
        ? (rawPrimaryAsset as AssetMetadata)
        : null;
    const assetStatus = primaryAsset
      ? 'READY'
      : assetRequest
        ? 'PENDING'
        : 'NOT_REQUIRED';
    const wrongAnswers = this.normalizeWrongAnswers(
      raw.wrongAnswers ??
        raw.wrong_answers ??
        raw.incorrectAnswers ??
        raw.distractors,
      correctAnswer,
      issues,
    );
    const difficulty = ['easy', 'medium', 'hard'].includes(
      this.readString(raw.difficulty),
    )
      ? (this.readString(raw.difficulty) as 'easy' | 'medium' | 'hard')
      : requestedDifficulty;

    return {
      question: question || `سؤال غير مكتمل ${index + 1}`,
      correctAnswer,
      wrongAnswers,
      difficulty,
      gameMode,
      type,
      assetRequest,
      assetStatus,
      asset: primaryAsset,
      primaryAssetRequest,
      primaryAssetStatus: assetStatus,
      primaryAsset,
      coverImageRequest,
      coverImageStatus:
        raw.coverImage && typeof raw.coverImage === 'object'
          ? 'READY'
          : coverImageRequest
            ? 'PENDING'
            : 'FAILED',
      coverImage:
        raw.coverImage && typeof raw.coverImage === 'object'
          ? (raw.coverImage as AssetMetadata)
          : null,
      coverImageFailureReason: coverImageRequest
        ? null
        : 'Cover image request is missing',
      explanation,
      qualityScore,
      issues: Array.from(new Set(issues)),
      ...(Array.isArray(raw.agentTrace)
        ? { agentTrace: raw.agentTrace as AgentTrace[] }
        : {}),
    };
  }

  private readString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private readStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private normalizeGameMode(value: unknown, issues: string[]): GameMode {
    const normalized = this.readString(value);
    const supportedModes: GameMode[] = [
      'trivia',
      'identifyCharacter',
      'identifyVoice',
      'identifyImage',
      'completeQuote',
      'timeline',
      'emojiPuzzle',
      'identifySong',
      'identifySinger',
      'identifyMusicIntro',
    ];

    if (supportedModes.includes(normalized as GameMode)) {
      return normalized as GameMode;
    }

    issues.push('gameMode is missing or invalid');
    return 'trivia';
  }

  private normalizeQuestionAssetType(
    value: unknown,
    issues: string[],
  ): QuestionAssetType {
    const normalized = this.readString(value).toLowerCase();
    const supportedTypes: QuestionAssetType[] = [
      'text',
      'image',
      'audio',
      'quote',
      'emoji',
      'timeline',
    ];

    if (supportedTypes.includes(normalized as QuestionAssetType)) {
      return normalized as QuestionAssetType;
    }

    if (normalized) {
      issues.push(`unsupported question type: ${normalized}`);
    }

    return 'text';
  }

  private normalizeAssetRequest(
    value: unknown,
    type: QuestionAssetType,
  ): AssetRequest | null {
    if (type === 'text' && value == null) {
      return null;
    }

    if (!value || typeof value !== 'object') {
      return {
        type,
      };
    }

    const rawAssetRequest = value as Record<string, unknown>;

    return {
      ...rawAssetRequest,
      type,
      ...(this.readString(rawAssetRequest.provider)
        ? { provider: this.readString(rawAssetRequest.provider) }
        : {}),
      ...(this.readString(rawAssetRequest.query)
        ? { query: this.readString(rawAssetRequest.query) }
        : {}),
      entity: this.readString(rawAssetRequest.entity),
      assetType: type,
      ...(this.readString(rawAssetRequest.franchise)
        ? { franchise: this.readString(rawAssetRequest.franchise) }
        : {}),
      ...(this.readString(rawAssetRequest.language)
        ? { language: this.readString(rawAssetRequest.language) }
        : {}),
      ...(this.readString(rawAssetRequest.originalName)
        ? { originalName: this.readString(rawAssetRequest.originalName) }
        : {}),
      ...(this.readString(rawAssetRequest.localizedName)
        ? { localizedName: this.readString(rawAssetRequest.localizedName) }
        : {}),
      ...(this.readString(rawAssetRequest.englishTitle)
        ? { englishTitle: this.readString(rawAssetRequest.englishTitle) }
        : {}),
      ...(this.readString(rawAssetRequest.arabicTitle)
        ? { arabicTitle: this.readString(rawAssetRequest.arabicTitle) }
        : {}),
      context: this.readString(rawAssetRequest.context),
      ...(this.readString(rawAssetRequest.entityType)
        ? { entityType: this.readString(rawAssetRequest.entityType) }
        : {}),
      ...(this.readString(rawAssetRequest.visualHint)
        ? { visualHint: this.readString(rawAssetRequest.visualHint) }
        : {}),
      ...(this.readString(rawAssetRequest.categoryType)
        ? { categoryType: this.readString(rawAssetRequest.categoryType) }
        : {}),
      ...(this.readString(rawAssetRequest.purpose) === 'decorative' ||
      this.readString(rawAssetRequest.purpose) === 'gameplay'
        ? {
            purpose: this.readString(rawAssetRequest.purpose) as
              'decorative' | 'gameplay',
          }
        : {}),
      ...(rawAssetRequest.duration !== undefined
        ? { duration: Number(rawAssetRequest.duration) }
        : {}),
      ...(rawAssetRequest.speaker !== undefined
        ? { speaker: this.readString(rawAssetRequest.speaker) }
        : {}),
    };
  }

  private normalizeWrongAnswers(
    value: unknown,
    correctAnswer: string,
    issues: string[],
  ): string[] {
    const rawWrongAnswers = this.readStringArray(value);
    const normalizedCorrectAnswer =
      this.normalizeComparableAnswer(correctAnswer);
    const seen = new Set<string>();
    const wrongAnswers: string[] = [];

    for (const answer of rawWrongAnswers) {
      const comparable = this.normalizeComparableAnswer(answer);

      if (!comparable) {
        continue;
      }

      if (comparable === normalizedCorrectAnswer) {
        issues.push('correctAnswer appears in wrongAnswers');
        continue;
      }

      if (seen.has(comparable)) {
        issues.push('wrongAnswers are duplicated');
        continue;
      }

      seen.add(comparable);
      wrongAnswers.push(answer);
    }

    return wrongAnswers.slice(0, 3);
  }

  private normalizeQualityScore(value: unknown, issues: string[]): number {
    const numericValue =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value)
          : Number.NaN;

    if (!Number.isFinite(numericValue)) {
      issues.push('qualityScore is missing or invalid');
      return 1;
    }

    return Math.min(10, Math.max(1, Math.round(numericValue)));
  }

  private validateReviewedQuestionQuality(
    question: ReviewedQuestionDraft,
    index: number,
  ): ReviewedQuestionDraft {
    const issues = [...question.issues];

    if (question.question.length < 25) {
      issues.push('question is too short');
    }

    if (!question.correctAnswer) {
      issues.push('answer is missing');
    }

    if (!question.explanation || question.explanation.length < 5) {
      issues.push('explanation is missing');
    }

    if (question.qualityScore < 7) {
      issues.push('qualityScore is below 7');
    }

    if (!question.gameMode) {
      issues.push('gameMode is missing');
    }

    if (['audio', 'image'].includes(question.type) && !question.assetRequest) {
      issues.push('assetRequest is missing');
    }

    if (
      question.type === 'audio' &&
      !question.assetRequest?.query &&
      !question.assetRequest?.entity
    ) {
      issues.push('assetRequest entity or query is missing');
    }

    const normalizedWrongAnswers = question.wrongAnswers.map((answer) =>
      this.normalizeComparableAnswer(answer),
    );
    const uniqueWrongAnswers = new Set(normalizedWrongAnswers);

    if (
      question.wrongAnswers.length > 0 &&
      question.wrongAnswers.length !== 3
    ) {
      issues.push('wrongAnswers must have exactly 3 items');
    }

    if (uniqueWrongAnswers.size !== question.wrongAnswers.length) {
      issues.push('wrongAnswers are duplicated');
    }

    if (
      normalizedWrongAnswers.includes(
        this.normalizeComparableAnswer(question.correctAnswer),
      )
    ) {
      issues.push('correctAnswer appears in wrongAnswers');
    }

    return {
      ...question,
      question: question.question || `سؤال غير مكتمل ${index + 1}`,
      explanation: question.explanation || 'شرح غير مكتمل.',
      issues: Array.from(new Set(issues)),
    };
  }

  private normalizeComparableAnswer(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[إأآا]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/[^\p{L}\p{N}]+/gu, '');
  }

  private buildPrompt(categoryName: string, count: number): string {
    const questionCounts = this.getQuestionCountsByDifficulty(count);
    const categorySpecificRules =
      this.getCategorySpecificPromptRules(categoryName);

    return `You are a professional Arabic party-game question writer.
You write short, punchy, natural questions for a game similar to Seen Jeem / Jeopardy.
Your tone should feel fun, conversational, and perfectly suited for Saudi/Gulf players.
Avoid boring textbook questions, obvious facts, yes/no questions, and repeated wording.
Avoid questions that sound AI-generated.
Make each question feel human-written, lively, and ready to spark laughter or discussion.
Keep the wording natural in Arabic, not formal school language.

Category: "${categoryName}"

This category must have exactly ${count} questions:
- ${questionCounts.easy} easy questions worth 200 points
- ${questionCounts.medium} medium questions worth 400 points
- ${questionCounts.hard} hard questions worth 600 points

Question style:
- Short and punchy
- Specific answer
- Simple explanation
- Natural Arabic wording
- No multiple-choice
- No yes/no format
- Discussion-friendly when possible
- Not too obvious
${categorySpecificRules}

Media rules:
- If the category is movies/series/anime: include at least 1 video or image-type question
- If the category is sports: mostly text questions
- If the category is geography/history: text questions only unless a media clue is clearly useful

Return JSON only.
Do not add any extra text or explanation.

Output a JSON array of ${count} objects with exactly these fields:
- question (string)
- answer (string)
- explanation (string)
- difficulty (string): easy, medium, or hard
- points (number): 200, 400, or 600
- type (string): text, audio, video, or image

Example output:
[
  {
    "question": "اسمع مقطع أغنية خليجية بصوت محمد عبده... ما اسم الأغنية؟",
    "answer": "الأماكن", 
    "explanation": "الأغنية معروفة من لحنها ومطلعها ومرتبطة بصوت محمد عبده.",
    "difficulty": "easy",
    "points": 200,
    "type": "audio"
  }
]

Generate exactly ${count} questions for ${categoryName}.`;
  }

  private getQuestionCountsByDifficulty(count: number) {
    const baseCount = Math.floor(count / 3);
    const remainder = count % 3;

    return {
      easy: baseCount + (remainder >= 1 ? 1 : 0),
      medium: baseCount + (remainder >= 2 ? 1 : 0),
      hard: baseCount,
    };
  }

  private getCategorySpecificPromptRules(categoryName: string): string {
    if (!this.isSongsCategory(categoryName)) {
      return '';
    }

    return `

Songs category special rules:
- Generate ONLY audio questions.
- Every object must have "type": "audio".
- The question must be phrased as if the players will hear a short audio snippet from a specific song.
- The question must be unique and mention a non-answer clue such as the artist, era, mood, dialect, or scene, without revealing the song title.
- The question should ask for the song name, for example: "اسمع مقطع أغنية خليجية بصوت محمد عبده... ما اسم الأغنية؟"
- The answer must be the song title only, not the artist name.
- The explanation may mention the artist or why the snippet is recognizable.
- Use real, recognizable Saudi/Gulf/Arabic songs suitable for party-game players.
- Do not ask about lyrics, singer biography, album, year, or music trivia. The task is always identifying the song from the audio snippet.`;
  }

  private isSongsCategory(categoryName: string): boolean {
    const normalized = categoryName.toLowerCase().trim();

    return (
      normalized.includes('songs') ||
      normalized.includes('music') ||
      normalized.includes('أغاني') ||
      normalized.includes('اغاني') ||
      normalized.includes('موسيقى')
    );
  }

  private async callAiProvider(
    prompt: string,
    temperature = 0.8,
  ): Promise<string> {
    switch (this.aiProvider) {
      case 'openrouter':
        return this.callOpenRouter(prompt, temperature);
      case 'lmstudio':
        return this.callLmStudio(prompt, temperature);
      default:
        throw new BadRequestException(
          `Invalid AI_PROVIDER "${this.aiProvider}". Supported providers: openrouter, lmstudio`,
        );
    }
  }

  private async callOpenRouter(
    prompt: string,
    temperature: number,
  ): Promise<string> {
    try {
      const response = await this.fetchWithTimeout(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.openRouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Lammah Quiz Backend',
          },
          body: JSON.stringify({
            model: this.openRouterModel,
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature,
            max_tokens: this.aiMaxTokens,
          }),
        },
      );

      const data = (await response.json()) as ChatCompletionResponse;

      if (!response.ok) {
        throw new Error(
          data.error?.message ?? `OpenRouter returned ${response.status}`,
        );
      }

      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('OpenRouter response did not include message content');
      }

      return content;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        `OpenRouter API call failed: ${errorMessage}`,
      );
    }
  }

  private async callLmStudio(
    prompt: string,
    temperature: number,
  ): Promise<string> {
    const baseUrl = this.lmStudioBaseUrl.replace(/\/+$/, '');

    try {
      const response = await this.fetchWithTimeout(
        `${baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.lmStudioApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.lmStudioModel,
            messages: [
              {
                role: 'system',
                content: 'You are an Arabic party-game question generator.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature,
            max_tokens: this.aiMaxTokens,
          }),
        },
      );

      const data = (await response.json()) as ChatCompletionResponse;

      if (!response.ok) {
        throw new Error(
          data.error?.message ?? `LM Studio returned ${response.status}`,
        );
      }

      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('LM Studio response did not include message content');
      }

      return content;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isConnectionError =
        error instanceof TypeError ||
        /ECONNREFUSED|fetch failed|Failed to fetch/i.test(errorMessage);
      const isTimeoutError =
        error instanceof DOMException
          ? error.name === 'AbortError'
          : /AbortError|aborted/i.test(errorMessage);

      throw new InternalServerErrorException(
        isTimeoutError
          ? `LM Studio request timed out after ${this.aiRequestTimeoutMs}ms. Make sure the LM Studio server is running, the model "${this.lmStudioModel}" is loaded, and try a smaller count if generation is too slow.`
          : isConnectionError
            ? `LM Studio server is not running or unreachable at ${baseUrl}. Start the LM Studio local server and try again. Details: ${errorMessage}`
            : `LM Studio API call failed: ${errorMessage}`,
      );
    }
  }

  private async fetchWithTimeout(
    input: string | URL,
    init: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.aiRequestTimeoutMs,
    );

    try {
      return await fetch(input, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseAiResponse(response: string): unknown[] {
    try {
      const jsonString = this.cleanAiJsonResponse(response);

      const parsed = JSON.parse(jsonString);

      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      return parsed;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new BadRequestException(
        `Failed to parse AI response as JSON: ${errorMessage}`,
      );
    }
  }

  private cleanAiJsonResponse(response: string): string {
    let jsonString = response.trim();

    if (jsonString.startsWith('```json')) {
      jsonString = jsonString
        .replace(/^```json\s*/i, '')
        .replace(/\s*```$/, '');
    } else if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const firstArrayIndex = jsonString.indexOf('[');
    const firstObjectIndex = jsonString.indexOf('{');
    const candidates = [firstArrayIndex, firstObjectIndex].filter(
      (index) => index >= 0,
    );

    if (candidates.length > 0 && Math.min(...candidates) > 0) {
      jsonString = jsonString.slice(Math.min(...candidates));
    }

    const lastArrayIndex = jsonString.lastIndexOf(']');
    const lastObjectIndex = jsonString.lastIndexOf('}');
    const lastJsonIndex = Math.max(lastArrayIndex, lastObjectIndex);

    if (lastJsonIndex >= 0 && lastJsonIndex < jsonString.length - 1) {
      jsonString = jsonString.slice(0, lastJsonIndex + 1);
    }

    return jsonString.trim();
  }

  private reviewGeneratedQuestion(question: GeneratedQuestion) {
    const scoreValues = {
      fun: 0,
      clarity: 0,
      humanFeel: 0,
      difficultyMatch: 0,
      notObvious: 0,
    };

    const text =
      `${question.question} ${question.answer} ${question.explanation}`.toLowerCase();

    scoreValues.fun = /ضحك|طرائف|مضحك|فرفشة|ممتع|قصة/.test(text) ? 9 : 6;
    scoreValues.clarity = question.question.length < 120 ? 8 : 6;
    scoreValues.humanFeel = /يا|وش|ليه|كيف|أكثر|إيش|واضح|طبيعي/.test(text)
      ? 8
      : 6;
    scoreValues.difficultyMatch =
      question.difficulty === 'easy'
        ? 8
        : question.difficulty === 'medium'
          ? 7
          : 8;
    scoreValues.notObvious = /اكبر|اصغر|كم|مين|متى/.test(question.question)
      ? 7
      : 8;

    const average =
      (scoreValues.fun +
        scoreValues.clarity +
        scoreValues.humanFeel +
        scoreValues.difficultyMatch +
        scoreValues.notObvious) /
      5;

    const shouldRewrite = average < 8;

    return {
      score: Math.round(average * 10) / 10,
      reason: shouldRewrite
        ? 'السؤال يحتاج أسلوب أكثر حيوية وطبيعية وأقل نمطية.'
        : 'السؤال جيد وملائم.',
      shouldRewrite,
    };
  }

  private async rewriteQuestion(
    question: GeneratedQuestion,
    categoryName: string,
  ): Promise<GeneratedQuestion> {
    const rewritePrompt = `You are a professional Arabic party-game question writer.
Rewrite the following question to make it more fun, more natural, and less generic.
Keep the same difficulty, points, and type. Keep the same answer.
Use Saudi/Gulf Arabic tone and keep it clear and short.

Category: "${categoryName}"

Question object:
${JSON.stringify(question)}

Return only one JSON object with the same fields: question, answer, explanation, difficulty, points, type.`;

    const response = await this.callAiProvider(rewritePrompt);
    const rewrittenArray = this.parseAiResponse(
      `[${this.cleanAiJsonResponse(response)}]`,
    );
    const rewritten = rewrittenArray[0];

    if (!rewritten || typeof rewritten !== 'object') {
      throw new Error('Rewrite did not return a valid question object');
    }

    return {
      ...question,
      ...(rewritten as Record<string, unknown>),
    };
  }

  private validateGeneratedQuestions(
    questions: unknown[],
    expectedCount?: number,
  ): GeneratedQuestion[] {
    try {
      const validated = GeneratedQuestionsArraySchema.parse(questions);

      if (expectedCount !== undefined && validated.length !== expectedCount) {
        throw new Error(
          `Expected ${expectedCount} questions, but AI returned ${validated.length}`,
        );
      }

      return validated.map((q) => ({
        ...q,
        points:
          typeof q.points === 'string' ? parseInt(q.points, 10) : q.points,
        type: q.type || 'text',
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new BadRequestException(
        `Question validation failed: ${errorMessage}`,
      );
    }
  }

  private normalizeQuestionsForCategory(
    questions: GeneratedQuestion[],
    categoryName: string,
  ): GeneratedQuestion[] {
    if (!this.isSongsCategory(categoryName)) {
      return questions;
    }

    return questions.map((question) => ({
      ...question,
      type: 'audio',
    }));
  }

  private async removeDuplicates(
    questions: DraftGeneratedQuestion[],
    categoryId: string,
  ): Promise<DraftGeneratedQuestion[]> {
    // Remove duplicates within the batch
    const uniqueInBatch = Array.from(
      new Map(questions.map((q) => [q.question.toLowerCase(), q])).values(),
    );

    // Check against existing questions in MongoDB
    const existingQuestions =
      await this.questionRepository.findQuestionTexts(categoryId);

    const existingTexts = new Set(
      existingQuestions.map((q) => q.question.toLowerCase()),
    );

    const finalQuestions = uniqueInBatch.filter(
      (q) => !existingTexts.has(q.question.toLowerCase()),
    );

    return finalQuestions;
  }

  private async saveDraftQuestions(
    questions: DraftGeneratedQuestion[],
    categoryId: string,
  ): Promise<Record<string, unknown>[]> {
    const categoryObjectId = new Types.ObjectId(categoryId);

    const questionDocs = await Promise.all(
      questions.map(async (q) => {
        const media = await this.generateQuestionMedia(q);

        return {
          category: categoryObjectId,
          question: q.question,
          answer: q.answer,
          explanation: q.explanation,
          difficulty: q.difficulty,
          points: q.points,
          type: q.type,
          mediaUrl: q.mediaUrl ?? media?.mediaUrl,
          mediaKey: q.mediaKey ?? media?.mediaKey,
          spotifyTrackId: q.spotifyTrackId,
          spotifyArtist: q.spotifyArtist,
          spotifyAlbumName: q.spotifyAlbumName,
          spotifyAlbumImageUrl: q.spotifyAlbumImageUrl,
          spotifyUrl: q.spotifyUrl,
          hasPreviewAudio:
            q.hasPreviewAudio ?? !!(q.mediaUrl ?? media?.mediaUrl),
          status: 'draft',
          source: 'ai',
        };
      }),
    );

    const saved = await this.questionRepository.insertMany(questionDocs);
    return saved;
  }

  private async generateQuestionMedia(
    question: DraftGeneratedQuestion,
  ): Promise<
    | {
        mediaUrl: string;
        mediaKey: string;
      }
    | undefined
  > {
    if (question.type !== 'audio' || question.mediaUrl) {
      return undefined;
    }

    return this.generateAudioClue(question);
  }

  private async generateAudioClue(question: GeneratedQuestion) {
    const mediaKey = `audio/ai/${randomUUID()}.m4a`;
    const uploadRoot = join(process.cwd(), 'uploads');
    const audioDirectory = join(uploadRoot, 'audio', 'ai');
    const outputPath = join(uploadRoot, mediaKey);
    const tempPath = outputPath.replace(/\.m4a$/, '.aiff');
    const audioText = this.buildAudioClueText(question);

    await mkdir(audioDirectory, { recursive: true });

    try {
      await execFileAsync('say', [
        '-v',
        this.aiAudioVoice,
        '-o',
        tempPath,
        audioText,
      ]);
      await execFileAsync('afconvert', [
        tempPath,
        outputPath,
        '-f',
        'm4af',
        '-d',
        'aac',
      ]);
    } finally {
      await rm(tempPath, { force: true });
    }

    return {
      mediaUrl: `${this.appBaseUrl.replace(/\/+$/, '')}/uploads/${mediaKey}`,
      mediaKey,
    };
  }

  private buildAudioClueText(question: GeneratedQuestion): string {
    return `تحدي أغاني. ${question.question}`;
  }
}
