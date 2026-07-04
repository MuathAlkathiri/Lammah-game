import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { execFile } from 'child_process';
import { randomUUID } from 'crypto';
import { mkdir, rm } from 'fs/promises';
import { Model, Types } from 'mongoose';
import { join } from 'path';
import { promisify } from 'util';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';
import { CategoriesService } from '../categories/categories.service';
import { Question } from '../questions/schemas/question.schema';
import {
  GeneratedQuestionsArraySchema,
  GeneratedQuestion,
} from './schemas/generated-question.schema';

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
  private static readonly DEFAULT_QUESTION_COUNT = 6;
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
    @InjectModel(Question.name) private questionModel: Model<Question>,
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
    const category = await this.categoriesService.findById(categoryId);

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

  private async callAiProvider(prompt: string): Promise<string> {
    switch (this.aiProvider) {
      case 'openrouter':
        return this.callOpenRouter(prompt);
      case 'lmstudio':
        return this.callLmStudio(prompt);
      default:
        throw new BadRequestException(
          `Invalid AI_PROVIDER "${this.aiProvider}". Supported providers: openrouter, lmstudio`,
        );
    }
  }

  private async callOpenRouter(prompt: string): Promise<string> {
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
            temperature: 0.8,
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

  private async callLmStudio(prompt: string): Promise<string> {
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
            temperature: 0.8,
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

  private parseAiResponse(response: string): any[] {
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
      ...rewritten,
    };
  }

  private validateGeneratedQuestions(
    questions: any[],
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
    const categoryObjectId = new Types.ObjectId(categoryId);
    const existingQuestions = await this.questionModel.find({
      category: categoryObjectId,
    });

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
  ): Promise<any[]> {
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

    const saved = await this.questionModel.insertMany(questionDocs);
    return saved.map((q) => q.toObject());
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
