import { Injectable } from '@nestjs/common';
import { access } from 'fs/promises';
import {
  AssetMetadata,
  AssetProvider,
  AssetRequest,
} from '../../contracts/asset-provider.interface';
import { AssetProviderStepError } from './youtube-asset.provider';
import { ImageDownloadService } from './image-download.service';

type WikiPage = {
  title: string;
  fullurl?: string;
  thumbnail?: { source?: string };
  original?: { source?: string };
};
type WikiSearchResponse = { query?: { pages?: WikiPage[] } };
type CachedAsset = { asset: AssetMetadata; expiresAt: number };

@Injectable()
export class WikimediaImageProvider implements AssetProvider {
  private static readonly cache = new Map<string, CachedAsset>();
  private static requestQueue: Promise<void> = Promise.resolve();
  private static lastRequestAt = 0;
  private readonly cacheTtlMs = 24 * 60 * 60 * 1000;
  private readonly minRequestIntervalMs = 350;
  private readonly maxRetries = 2;

  constructor(private readonly downloader: ImageDownloadService) {}

  supports(request: AssetRequest) {
    return (
      request.type?.trim().toLowerCase() === 'image' &&
      (!request.provider ||
        request.provider.trim().toLowerCase() === 'wikimedia')
    );
  }

  async process(request: AssetRequest): Promise<AssetMetadata> {
    const attemptedQueries: string[] = [];
    const cacheKey = this.buildCacheKey(request);
    const cached = await this.getCached(cacheKey);
    if (cached)
      return this.withDiagnostics(
        cached,
        attemptedQueries,
        cached.searchQuery,
        true,
        0,
      );

    const candidates = this.buildCandidates(request);
    if (!candidates.length) {
      throw new AssetProviderStepError(
        'image-search',
        'Image request has no concise searchable metadata',
        {
          attemptedQueries,
          provider: 'wikimedia',
          cacheHit: false,
          retryCount: 0,
        },
      );
    }

    const failures: Array<{ query: string; reason: string }> = [];
    let totalRetries = 0;
    for (const query of candidates) {
      attemptedQueries.push(query);
      try {
        const result = await this.search(query);
        totalRetries += result.retryCount;
        const page = this.selectPage(result.pages, query);
        const imageUrl = page?.original?.source ?? page?.thumbnail?.source;
        if (!page || !imageUrl) {
          failures.push({ query, reason: 'No page image found' });
          continue;
        }

        const stored = await this.downloader.download(imageUrl, page.title);
        const asset: AssetMetadata = {
          type: 'image',
          ...stored,
          source: 'wikimedia',
          sourceUrl: page.fullurl ?? imageUrl,
          provider: 'wikimedia',
          searchQuery: query,
          metadata: {
            title: page.title,
            attribution: 'Wikimedia contributors',
          },
        };
        WikimediaImageProvider.cache.set(cacheKey, {
          asset,
          expiresAt: Date.now() + this.cacheTtlMs,
        });
        return this.withDiagnostics(
          asset,
          attemptedQueries,
          query,
          false,
          totalRetries,
        );
      } catch (error) {
        const retryCount =
          error instanceof WikimediaRequestError ? error.retryCount : 0;
        totalRetries += retryCount;
        failures.push({
          query,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    throw new AssetProviderStepError(
      'image-search',
      'No Wikimedia image matched the request',
      {
        attemptedQueries,
        provider: 'wikimedia',
        cacheHit: false,
        retryCount: totalRetries,
        attempts: failures,
      },
    );
  }

  buildCandidates(request: AssetRequest): string[] {
    const entity = this.cleanTerm(request.entity);
    const franchise = this.cleanTerm(request.franchise);
    const originalName = this.cleanTerm(request.originalName);
    const entityType = this.cleanTerm(request.entityType);
    const legacyQuery = this.cleanLegacyQuery(request.query);
    const candidates: Array<string | undefined> = [];

    if (request.purpose === 'decorative') {
      candidates.push(
        franchise,
        franchise && `${franchise} logo`,
        franchise && `${franchise} promotional visual`,
      );
      if (!franchise)
        candidates.push(
          entityType === 'location' ? entity : undefined,
          this.cleanTerm(request.context),
        );
    } else if (entityType === 'location') {
      candidates.push(
        entity,
        entity && franchise ? `${entity} ${franchise}` : undefined,
        entity && `${entity} location`,
      );
    } else if (entityType === 'character' || entity) {
      candidates.push(
        entity,
        entity && franchise ? `${entity} ${franchise}` : undefined,
        entity && `${entity} portrait`,
        originalName,
        franchise && entityType ? `${franchise} ${entityType}` : undefined,
      );
    } else {
      candidates.push(
        originalName,
        franchise,
        this.cleanTerm(request.localizedName),
        this.cleanTerm(request.visualHint),
      );
    }
    candidates.push(legacyQuery);
    return [
      ...new Set(candidates.filter((value): value is string => Boolean(value))),
    ];
  }

  private cleanTerm(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const cleaned = value
      .replace(/[؟?!.،,:;؛"'()[\]{}]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned && cleaned.length <= 80 && cleaned.split(' ').length <= 8
      ? cleaned
      : undefined;
  }

  private cleanLegacyQuery(value: unknown): string | undefined {
    const cleaned = this.cleanTerm(value);
    if (!cleaned) return undefined;
    const questionWords =
      /^(من|ما|ماذا|أين|اين|متى|كيف|لماذا|هل|who|what|where|when|how)\b/i;
    const explanatory =
      /(صورة|ابحث|توضح|تظهر|تمثل|لقطة|الشخصية التي|image of|photo of|showing)/i;
    return questionWords.test(cleaned) || explanatory.test(cleaned)
      ? undefined
      : cleaned;
  }

  private async search(
    query: string,
  ): Promise<{ pages: WikiPage[]; retryCount: number }> {
    return this.serialize(async () => {
      let retryCount = 0;
      while (true) {
        await this.waitForRateWindow();
        const endpoint = this.buildEndpoint(query);
        const response = await fetch(endpoint, {
          signal: AbortSignal.timeout(10_000),
          headers: {
            'User-Agent':
              'LammahQuiz/1.0 (contact: admin@lammah.app; question image retrieval)',
            Accept: 'application/json',
          },
        });
        WikimediaImageProvider.lastRequestAt = Date.now();
        if (response.status !== 429) {
          if (!response.ok)
            throw new WikimediaRequestError(
              `Wikipedia returned HTTP ${response.status}`,
              retryCount,
            );
          return {
            pages:
              ((await response.json()) as WikiSearchResponse).query?.pages ??
              [],
            retryCount,
          };
        }
        if (retryCount >= this.maxRetries)
          throw new WikimediaRequestError(
            'Wikipedia rate limit persisted after retries',
            retryCount,
          );
        const retryAfter = Number(response.headers.get('retry-after'));
        const delayMs =
          Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : 1000 * 2 ** retryCount;
        retryCount += 1;
        await this.delay(Math.min(delayMs, 10_000));
      }
    });
  }

  private buildEndpoint(query: string) {
    const endpoint = new URL('https://en.wikipedia.org/w/api.php');
    const params = {
      action: 'query',
      generator: 'search',
      gsrsearch: query,
      gsrlimit: '5',
      prop: 'pageimages|info',
      piprop: 'original|thumbnail|name',
      pithumbsize: '1200',
      inprop: 'url',
      format: 'json',
      origin: '*',
    };
    Object.entries(params).forEach(([key, value]) =>
      endpoint.searchParams.set(key, value),
    );
    return endpoint;
  }

  private selectPage(pages: WikiPage[], query: string) {
    return (
      pages.find(
        (page) =>
          page.title.localeCompare(query, undefined, {
            sensitivity: 'accent',
          }) === 0 &&
          (page.original?.source || page.thumbnail?.source),
      ) ?? pages.find((page) => page.original?.source || page.thumbnail?.source)
    );
  }

  private buildCacheKey(request: AssetRequest) {
    return ['wikimedia', request.entity, request.franchise, request.purpose]
      .map((value) =>
        String(value ?? '')
          .trim()
          .toLowerCase(),
      )
      .join('|');
  }

  private async getCached(key: string) {
    const cached = WikimediaImageProvider.cache.get(key);
    if (!cached || cached.expiresAt <= Date.now()) {
      WikimediaImageProvider.cache.delete(key);
      return null;
    }
    try {
      await access(
        cached.asset.localPath.startsWith('/')
          ? cached.asset.localPath
          : this.downloader.absolutePath(cached.asset.localPath),
      );
      return cached.asset;
    } catch {
      WikimediaImageProvider.cache.delete(key);
      return null;
    }
  }

  private withDiagnostics(
    asset: AssetMetadata,
    attemptedQueries: string[],
    successfulQuery: string | undefined,
    cacheHit: boolean,
    retryCount: number,
  ): AssetMetadata {
    return {
      ...asset,
      metadata: {
        ...asset.metadata,
        attemptedQueries,
        successfulQuery,
        provider: 'wikimedia',
        cacheHit,
        retryCount,
      },
    };
  }

  private async serialize<T>(operation: () => Promise<T>): Promise<T> {
    const previous = WikimediaImageProvider.requestQueue;
    let release!: () => void;
    WikimediaImageProvider.requestQueue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }

  private async waitForRateWindow() {
    const remaining =
      this.minRequestIntervalMs -
      (Date.now() - WikimediaImageProvider.lastRequestAt);
    if (remaining > 0) await this.delay(remaining);
  }
  private delay(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }
}

class WikimediaRequestError extends Error {
  constructor(
    message: string,
    readonly retryCount: number,
  ) {
    super(message);
  }
}
