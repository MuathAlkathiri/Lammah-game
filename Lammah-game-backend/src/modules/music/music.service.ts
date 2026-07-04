import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { execFile } from 'child_process';
import { randomUUID } from 'crypto';
import { mkdir, rm, unlink, writeFile } from 'fs/promises';
import { Model, Types } from 'mongoose';
import { extname, join } from 'path';
import { promisify } from 'util';
import { Category } from '../categories/schemas/category.schema';
import {
  DifficultyLevel,
  Question,
  QuestionPoints,
  QuestionSource,
  QuestionStatus,
  QuestionType,
} from '../questions/schemas/question.schema';
import { UploadMusicTrackDto, UpdateMusicTrackDto } from './dto/music.dto';
import { MusicMetadataAgentService } from './music-metadata-agent.service';
import { MusicTrack, MusicTrackSource } from './schemas/music-track.schema';
import { normalizeMusicAnswer } from './utils/answer-normalization.util';

const execFileAsync = promisify(execFile);

interface UploadedAudioFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

export interface GuessSongQuestionResponse {
  id: string;
  type: 'guess_song';
  question: 'ما اسم هذه الأغنية؟';
  audioUrl: string;
  answer: string;
  difficulty: DifficultyLevel;
  metadata: {
    artist?: string;
    album?: string;
    genre?: string;
    language?: string;
    source: 'admin-upload';
    musicTrackId: string;
  };
}

@Injectable()
export class MusicService {
  private static readonly DEFAULT_SNIPPET_DURATION_SECONDS = 15;
  private static readonly MIN_SNIPPET_DURATION_SECONDS = 10;
  private static readonly MAX_SNIPPET_DURATION_SECONDS = 20;
  private static readonly ALLOWED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a'];
  private static readonly ALLOWED_AUDIO_MIME_TYPES = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/mp4',
    'audio/m4a',
    'audio/x-m4a',
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly metadataAgentService: MusicMetadataAgentService,
    @InjectModel(MusicTrack.name)
    private readonly musicTrackModel: Model<MusicTrack>,
    @InjectModel(Question.name)
    private readonly questionModel: Model<Question>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<Category>,
  ) {}

  async createFromUpload(
    file: UploadedAudioFile | undefined,
    dto: UploadMusicTrackDto,
  ) {
    if (!file) {
      throw new BadRequestException('Audio file is required');
    }

    this.validateAudioFile(file);

    const uploadsRoot = this.getUploadsRoot();
    const originalsDir = join(uploadsRoot, 'music', 'originals');
    const snippetsDir = join(uploadsRoot, 'music', 'snippets');
    await mkdir(originalsDir, { recursive: true });
    await mkdir(snippetsDir, { recursive: true });

    const id = randomUUID();
    const extension = extname(file.originalname).toLowerCase();
    const originalFilename = `${id}${extension}`;
    const snippetFilename = `${id}-snippet.mp3`;
    const originalPath = join(originalsDir, originalFilename);
    const snippetPath = join(snippetsDir, snippetFilename);

    await writeFile(originalPath, file.buffer);

    try {
      const durationSeconds = await this.getAudioDurationSeconds(originalPath);
      const snippetDurationSeconds = this.getSnippetDuration(
        dto.snippetDurationSeconds,
      );
      const snippetStartSecond = this.getSnippetStart(
        dto.snippetStartSecond,
        durationSeconds,
        snippetDurationSeconds,
      );

      await this.createSnippet({
        inputPath: originalPath,
        outputPath: snippetPath,
        startSecond: snippetStartSecond,
        durationSeconds: snippetDurationSeconds,
      });

      const metadata = await this.metadataAgentService.inferMetadata({
        filename: file.originalname,
        title: dto.title,
        artist: dto.artist,
        album: dto.album,
        language: dto.language,
        genre: dto.genre,
        difficulty: dto.difficulty,
      });

      const shouldDeleteOriginal = this.getBooleanConfig(
        'MUSIC_DELETE_ORIGINAL_AFTER_SNIPPET',
        false,
      );

      if (shouldDeleteOriginal) {
        await unlink(originalPath).catch(() => undefined);
      }

      const musicTrack = await this.musicTrackModel.create({
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        originalAudioUrl: shouldDeleteOriginal
          ? undefined
          : `/uploads/music/originals/${originalFilename}`,
        snippetAudioUrl: `/uploads/music/snippets/${snippetFilename}`,
        durationSeconds,
        snippetStartSecond,
        snippetDurationSeconds,
        language: metadata.language,
        genre: metadata.genre,
        difficulty: metadata.difficulty,
        source: MusicTrackSource.ADMIN_UPLOAD,
        isActive: true,
      });

      const question = await this.createQuestionForTrack(musicTrack);

      return {
        musicTrack,
        question: this.toGuessSongQuestion(question, musicTrack),
      };
    } catch (error) {
      await rm(snippetPath, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  async findAll() {
    return this.musicTrackModel.find().sort({ createdAt: -1 }).exec();
  }

  async findById(id: string) {
    this.assertValidObjectId(id, 'id');

    const musicTrack = await this.musicTrackModel.findById(id).exec();

    if (!musicTrack) {
      throw new NotFoundException(`Music track with ID "${id}" not found`);
    }

    return musicTrack;
  }

  async update(id: string, dto: UpdateMusicTrackDto) {
    this.assertValidObjectId(id, 'id');

    const musicTrack = await this.musicTrackModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();

    if (!musicTrack) {
      throw new NotFoundException(`Music track with ID "${id}" not found`);
    }

    await this.questionModel
      .updateMany(
        { musicTrack: musicTrack._id },
        {
          answer: musicTrack.title,
          difficulty: musicTrack.difficulty ?? DifficultyLevel.EASY,
          metadata: this.buildQuestionMetadata(musicTrack),
        },
      )
      .exec();

    return musicTrack;
  }

  async softDelete(id: string) {
    this.assertValidObjectId(id, 'id');

    const musicTrack = await this.musicTrackModel
      .findByIdAndUpdate(id, { isActive: false }, { new: true })
      .exec();

    if (!musicTrack) {
      throw new NotFoundException(`Music track with ID "${id}" not found`);
    }

    await this.questionModel
      .updateMany(
        { musicTrack: musicTrack._id },
        { status: QuestionStatus.REJECTED },
      )
      .exec();

    return musicTrack;
  }

  async validateAnswer(questionId: string, answer: string) {
    this.assertValidObjectId(questionId, 'questionId');

    const question = await this.questionModel.findById(questionId).exec();

    if (!question) {
      throw new NotFoundException(`Question with ID "${questionId}" not found`);
    }

    if (
      question.type !== QuestionType.AUDIO ||
      question.source !== QuestionSource.MUSIC ||
      !question.mediaUrl
    ) {
      throw new BadRequestException('Question is not a music audio question');
    }

    const normalizedAnswer = normalizeMusicAnswer(answer);
    const normalizedCorrectAnswer = normalizeMusicAnswer(question.answer);

    if (!normalizedAnswer) {
      throw new BadRequestException('Answer is required');
    }

    return {
      isCorrect: normalizedAnswer === normalizedCorrectAnswer,
      normalizedAnswer,
      normalizedCorrectAnswer,
    };
  }

  private validateAudioFile(file: UploadedAudioFile) {
    const extension = extname(file.originalname).toLowerCase();

    if (!MusicService.ALLOWED_AUDIO_EXTENSIONS.includes(extension)) {
      throw new BadRequestException('Only mp3, wav, and m4a files are allowed');
    }

    if (
      file.mimetype &&
      !MusicService.ALLOWED_AUDIO_MIME_TYPES.includes(file.mimetype)
    ) {
      throw new BadRequestException('Only mp3, wav, and m4a files are allowed');
    }
  }

  private getSnippetDuration(value?: number): number {
    if (value === undefined) {
      return MusicService.DEFAULT_SNIPPET_DURATION_SECONDS;
    }

    if (!Number.isFinite(value)) {
      throw new BadRequestException('snippetDurationSeconds must be a number');
    }

    return Math.min(
      Math.max(value, MusicService.MIN_SNIPPET_DURATION_SECONDS),
      MusicService.MAX_SNIPPET_DURATION_SECONDS,
    );
  }

  private getSnippetStart(
    requestedStart: number | undefined,
    durationSeconds: number | undefined,
    snippetDurationSeconds: number,
  ) {
    const duration = durationSeconds ?? 0;
    const maxStart = Math.max(duration - snippetDurationSeconds, 0);
    const defaultStart = duration >= 30 + snippetDurationSeconds ? 30 : 0;
    const start = requestedStart ?? defaultStart;

    return Math.min(Math.max(start, 0), maxStart);
  }

  private async getAudioDurationSeconds(filePath: string) {
    try {
      const { stdout } = await execFileAsync('ffprobe', [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        filePath,
      ]);
      const duration = Number(stdout.trim());

      return Number.isFinite(duration)
        ? Math.round(duration * 100) / 100
        : undefined;
    } catch (error) {
      this.throwFfmpegError(error, 'FFprobe failed to inspect the audio file');
    }
  }

  private async createSnippet(input: {
    inputPath: string;
    outputPath: string;
    startSecond: number;
    durationSeconds: number;
  }) {
    try {
      await execFileAsync('ffmpeg', [
        '-y',
        '-ss',
        String(input.startSecond),
        '-i',
        input.inputPath,
        '-t',
        String(input.durationSeconds),
        '-vn',
        '-acodec',
        'libmp3lame',
        '-ar',
        '44100',
        '-ac',
        '2',
        input.outputPath,
      ]);
    } catch (error) {
      this.throwFfmpegError(error, 'FFmpeg failed to create the audio snippet');
    }
  }

  private throwFfmpegError(error: unknown, fallbackMessage: string): never {
    if (
      error instanceof Error &&
      ('code' in error || error.message.includes('ENOENT'))
    ) {
      throw new InternalServerErrorException(
        'FFmpeg is not installed or is not available in PATH. Install ffmpeg locally and rebuild the backend Docker image.',
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new InternalServerErrorException(`${fallbackMessage}: ${message}`);
  }

  private async createQuestionForTrack(musicTrack: MusicTrack) {
    if (!musicTrack.snippetAudioUrl) {
      throw new BadRequestException(
        'Cannot create music question without audio',
      );
    }

    const category = await this.getMusicCategory();
    const difficulty = musicTrack.difficulty ?? DifficultyLevel.EASY;

    return this.questionModel.create({
      category: category._id,
      question: 'ما اسم هذه الأغنية؟',
      answer: musicTrack.title,
      explanation: musicTrack.artist
        ? `الأغنية هي "${musicTrack.title}" للفنان ${musicTrack.artist}.`
        : `الأغنية هي "${musicTrack.title}".`,
      difficulty,
      points: this.pointsForDifficulty(difficulty),
      type: QuestionType.AUDIO,
      mediaUrl: musicTrack.snippetAudioUrl,
      mediaKey: `admin-upload:${musicTrack._id.toString()}`,
      musicTrack: musicTrack._id,
      hasPreviewAudio: true,
      status: QuestionStatus.DRAFT,
      source: QuestionSource.MUSIC,
      isFreeGameQuestion: false,
      metadata: this.buildQuestionMetadata(musicTrack),
    });
  }

  private buildQuestionMetadata(musicTrack: MusicTrack) {
    return {
      artist: musicTrack.artist,
      album: musicTrack.album,
      genre: musicTrack.genre,
      language: musicTrack.language,
      source: MusicTrackSource.ADMIN_UPLOAD,
      musicTrackId: musicTrack._id.toString(),
    };
  }

  private toGuessSongQuestion(
    question: Question,
    musicTrack: MusicTrack,
  ): GuessSongQuestionResponse {
    return {
      id: question._id.toString(),
      type: 'guess_song',
      question: 'ما اسم هذه الأغنية؟',
      audioUrl: musicTrack.snippetAudioUrl,
      answer: musicTrack.title,
      difficulty: musicTrack.difficulty ?? DifficultyLevel.EASY,
      metadata: this.buildQuestionMetadata(musicTrack),
    };
  }

  private async getMusicCategory() {
    const configuredSlug =
      this.configService.get<string>('MUSIC_QUESTION_CATEGORY_SLUG') ?? 'songs';
    const category = await this.categoryModel
      .findOne({
        isActive: true,
        $or: [
          { slug: configuredSlug },
          { slug: 'music' },
          { slug: 'songs' },
          { name: /^(music|songs|أغاني|اغاني|موسيقى)$/i },
        ],
      })
      .exec();

    if (!category) {
      throw new InternalServerErrorException(
        `Music question category "${configuredSlug}" was not found. Set MUSIC_QUESTION_CATEGORY_SLUG or create a music/songs category.`,
      );
    }

    return category;
  }

  private pointsForDifficulty(difficulty: DifficultyLevel): QuestionPoints {
    if (difficulty === DifficultyLevel.HARD) {
      return QuestionPoints.HIGH;
    }

    if (difficulty === DifficultyLevel.MEDIUM) {
      return QuestionPoints.MEDIUM;
    }

    return QuestionPoints.LOW;
  }

  private getUploadsRoot() {
    const configuredPath = this.configService.get<string>('UPLOADS_DIR');

    return configuredPath
      ? join(configuredPath)
      : join(process.cwd(), 'uploads');
  }

  private getBooleanConfig(key: string, defaultValue: boolean): boolean {
    const value = this.configService.get<string>(key);

    if (!value) {
      return defaultValue;
    }

    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }

  private assertValidObjectId(id: string, fieldName: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`${fieldName} must be a valid MongoDB ID`);
    }
  }
}
