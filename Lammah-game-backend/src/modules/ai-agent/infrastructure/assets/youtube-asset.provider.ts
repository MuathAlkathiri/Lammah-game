import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { randomUUID } from 'crypto';
import { access, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { promisify } from 'util';
import {
  AssetMetadata,
  AssetProvider,
  AssetRequest,
} from '../../contracts/asset-provider.interface';

const execFileAsync = promisify(execFile);

export type AssetProviderStep =
  | 'tool-detection'
  | 'search'
  | 'select-video'
  | 'download'
  | 'trim'
  | 'store'
  | 'image-search';

type CommandResult = {
  stdout: string;
  stderr: string;
};

type SearchResult = {
  sourceUrl: string;
  searchQuery: string;
};

export class AssetProviderStepError extends Error {
  constructor(
    readonly step: AssetProviderStep,
    reason: string,
    readonly diagnostics?: Record<string, unknown>,
  ) {
    super(reason);
  }
}

@Injectable()
export class YouTubeAssetProvider implements AssetProvider {
  private readonly logger = new Logger(YouTubeAssetProvider.name);
  private readonly appBaseUrl: string;
  private readonly uploadsRoot: string;
  private ffmpegBinary = 'ffmpeg';
  private ytDlpBinary = 'yt-dlp';

  constructor(private readonly configService: ConfigService) {
    this.appBaseUrl =
      this.configService.get<string>('APP_BASE_URL') ?? 'http://localhost:3000';
    this.uploadsRoot =
      this.configService.get<string>('UPLOADS_DIR') ??
      join(process.cwd(), 'uploads');
  }

  supports(assetRequest: AssetRequest): boolean {
    const configured = this.configService.get<string>(
      'ALLOW_YOUTUBE_ASSET_DOWNLOADS',
    );
    const downloadsAllowed = configured
      ? configured.toLowerCase() === 'true'
      : this.configService.get<string>('NODE_ENV') !== 'production';
    return (
      downloadsAllowed &&
      assetRequest.type === 'audio' &&
      (assetRequest.provider ?? '').toLowerCase() === 'youtube' &&
      (this.readString(assetRequest.entity).length > 0 ||
        this.readString(assetRequest.originalName).length > 0 ||
        this.readString(assetRequest.localizedName).length > 0 ||
        this.readString(assetRequest.query).length > 0)
    );
  }

  async process(assetRequest: AssetRequest): Promise<AssetMetadata> {
    if (!this.supports(assetRequest)) {
      throw new Error('YouTube provider only supports audio requests');
    }

    const searchCandidates = this.buildSearchCandidates(assetRequest);
    const duration = this.normalizeDuration(assetRequest.duration);
    const mediaKey = `question-assets/audio/${randomUUID()}.m4a`;
    const audioDirectory = join(this.uploadsRoot, 'question-assets', 'audio');
    const outputPath = join(this.uploadsRoot, mediaKey);
    const tempBasePath = join(audioDirectory, `${randomUUID()}-source`);

    await mkdir(audioDirectory, { recursive: true });

    try {
      this.ytDlpBinary = await this.resolveBinary('yt-dlp', '/usr/bin/yt-dlp');
      this.ffmpegBinary = await this.resolveBinary('ffmpeg', '/usr/bin/ffmpeg');

      const { sourceUrl, searchQuery } = await this.search(searchCandidates);
      const sourcePattern = `${tempBasePath}.%(ext)s`;
      await this.runCommand('download', this.ytDlpBinary, [
        sourceUrl,
        '-f',
        'bestaudio',
        '--extract-audio',
        '--audio-format',
        'm4a',
        '-o',
        sourcePattern,
      ]);

      const sourcePath = `${tempBasePath}.m4a`;
      await this.runCommand('trim', this.ffmpegBinary, [
        '-y',
        '-i',
        sourcePath,
        '-t',
        String(duration),
        '-c:a',
        'aac',
        outputPath,
      ]);

      this.logger.log('Step 5: Store locally');
      await this.assertFileExists('store', outputPath);
      this.logger.log(`Step 5 complete: Store locally (${outputPath})`);

      return {
        localPath: outputPath,
        url: `${this.appBaseUrl.replace(/\/+$/, '')}/uploads/${mediaKey}`,
        duration,
        source: 'youtube',
        sourceUrl,
        searchQuery,
        provider: 'youtube',
        type: 'audio',
      };
    } finally {
      await rm(`${tempBasePath}.m4a`, { force: true });
      await rm(`${tempBasePath}.webm`, { force: true });
      await rm(`${tempBasePath}.opus`, { force: true });
    }
  }

  private buildSearchCandidates(assetRequest: AssetRequest): string[] {
    const entity = this.readString(assetRequest.entity);
    const franchise = this.readString(assetRequest.franchise);
    const language = this.readString(assetRequest.language);
    const originalName = this.readString(assetRequest.originalName);
    const localizedName = this.readString(assetRequest.localizedName);
    const englishTitle = this.readString(assetRequest.englishTitle);
    const arabicTitle = this.readString(assetRequest.arabicTitle);
    const speaker = this.readString(assetRequest.speaker);
    const context = this.readString(assetRequest.context);
    const legacyQuery = this.readString(assetRequest.query);
    const primaryName = entity || originalName || localizedName || speaker;
    const title = franchise || englishTitle || arabicTitle;
    const candidates = [
      [primaryName, language, 'voice'],
      [title, primaryName, 'voice'],
      [primaryName, 'fight'],
      [primaryName, 'speech'],
      [primaryName, 'scene'],
      [title, primaryName, 'scene'],
      [originalName, language, 'voice'],
      [title, originalName, 'voice'],
      [localizedName, language, 'voice'],
      [arabicTitle, localizedName || entity, 'مشهد'],
      [englishTitle, primaryName, 'voice'],
      [primaryName, context],
      [title, primaryName, context],
      [legacyQuery],
    ]
      .map((parts) => this.joinSearchParts(parts))
      .filter(Boolean);

    return Array.from(new Set(candidates));
  }

  private readString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private async search(candidates: string[]): Promise<SearchResult> {
    const attemptedQueries: Array<{
      query: string;
      reason?: string;
      stdout?: string;
      stderr?: string;
    }> = [];

    if (!candidates.length) {
      throw new AssetProviderStepError(
        'search',
        'No YouTube search candidates could be built from asset metadata',
      );
    }

    for (const query of candidates) {
      try {
        this.logger.log(`Trying YouTube search candidate: "${query}"`);
        const { stdout, stderr } = await this.runCommand(
          'search',
          this.ytDlpBinary,
          [`ytsearch1:${query}`, '--print', 'webpage_url', '--skip-download'],
        );

        this.logger.log('Step 2: Select video');
        const sourceUrl = stdout.trim().split('\n')[0];

        if (!sourceUrl) {
          attemptedQueries.push({
            query,
            reason: 'yt-dlp returned no video URL',
            stdout: stdout.trim(),
            stderr: stderr.trim(),
          });
          continue;
        }

        this.logger.log(
          `Step 2 complete: Select video (${sourceUrl}) using query "${query}"`,
        );
        this.logger.log(`YouTube search query succeeded: "${query}"`);
        return {
          sourceUrl,
          searchQuery: query,
        };
      } catch (error) {
        attemptedQueries.push({
          query,
          reason: this.errorMessage(error),
          ...this.commandDiagnostics(error),
        });
        this.logger.warn(
          `YouTube search candidate failed: "${query}" (${this.errorMessage(error)})`,
        );
      }
    }

    throw new AssetProviderStepError(
      'search',
      `No valid YouTube video found after ${attemptedQueries.length} search strategies`,
      this.withDevelopmentOutput({
        attemptedQueries,
      }),
    );
  }

  private async resolveBinary(
    command: string,
    absolutePath: string,
  ): Promise<string> {
    const versionArgs = command === 'ffmpeg' ? ['-version'] : ['--version'];

    try {
      await this.runCommand('tool-detection', command, versionArgs, {
        logAsPipelineStep: false,
      });
      return command;
    } catch (pathError) {
      try {
        await access(absolutePath);
        await this.runCommand('tool-detection', absolutePath, versionArgs, {
          logAsPipelineStep: false,
        });
        return absolutePath;
      } catch (absoluteError) {
        throw new AssetProviderStepError(
          'tool-detection',
          `${command} detection failed. PATH command error: ${this.errorMessage(pathError)}. Absolute path error: ${this.errorMessage(absoluteError)}`,
          this.withDevelopmentOutput({
            command,
            absolutePath,
            pathError: this.commandDiagnostics(pathError),
            absoluteError: this.commandDiagnostics(absoluteError),
          }),
        );
      }
    }
  }

  private async runCommand(
    step: AssetProviderStep,
    command: string,
    args: string[],
    options?: { logAsPipelineStep?: boolean },
  ): Promise<CommandResult> {
    const shouldLogStep = options?.logAsPipelineStep ?? true;

    if (shouldLogStep) {
      this.logger.log(`${this.stepLabel(step)}: ${command} ${args.join(' ')}`);
    }

    try {
      const { stdout, stderr } = await execFileAsync(command, args);

      if (shouldLogStep) {
        this.logger.log(`${this.stepLabel(step)} complete`);
      }

      return {
        stdout,
        stderr,
      };
    } catch (error) {
      const diagnostics = this.commandDiagnostics(error);
      const reason = `${command} failed during ${step}: ${this.errorMessage(error)}`;

      this.logger.error(
        `${this.stepLabel(step)} failed: ${reason}`,
        JSON.stringify(diagnostics),
      );

      throw new AssetProviderStepError(
        step,
        reason,
        this.withDevelopmentOutput({
          command,
          args,
          ...diagnostics,
        }),
      );
    }
  }

  private async assertFileExists(
    step: AssetProviderStep,
    filePath: string,
  ): Promise<void> {
    try {
      await access(filePath);
    } catch (error) {
      throw new AssetProviderStepError(
        step,
        `Generated asset file was not found at ${filePath}: ${this.errorMessage(error)}`,
        this.withDevelopmentOutput({
          filePath,
          error: this.commandDiagnostics(error),
        }),
      );
    }
  }

  private stepLabel(step: AssetProviderStep): string {
    const labels: Record<AssetProviderStep, string> = {
      'tool-detection': 'Tool detection',
      search: 'Step 1: Search YouTube',
      'select-video': 'Step 2: Select video',
      download: 'Step 3: Download audio',
      trim: 'Step 4: Trim using ffmpeg',
      store: 'Step 5: Store locally',
      'image-search': 'Search image provider',
    };

    return labels[step];
  }

  private commandDiagnostics(error: unknown): Record<string, unknown> {
    const commandError = error as {
      code?: unknown;
      signal?: unknown;
      stdout?: unknown;
      stderr?: unknown;
      path?: unknown;
      syscall?: unknown;
    };

    return {
      code: commandError.code,
      signal: commandError.signal,
      path: commandError.path,
      syscall: commandError.syscall,
      stdout:
        typeof commandError.stdout === 'string'
          ? commandError.stdout.trim()
          : commandError.stdout,
      stderr:
        typeof commandError.stderr === 'string'
          ? commandError.stderr.trim()
          : commandError.stderr,
    };
  }

  private joinSearchParts(parts: unknown[]): string {
    return parts
      .map((part) => this.readString(part))
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  private withDevelopmentOutput(
    diagnostics: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    if (process.env.NODE_ENV === 'production') {
      return undefined;
    }

    return diagnostics;
  }

  private normalizeDuration(duration: unknown): number {
    const parsed = Number(duration);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 6;
    }

    return Math.min(20, Math.max(1, Math.round(parsed)));
  }
}
