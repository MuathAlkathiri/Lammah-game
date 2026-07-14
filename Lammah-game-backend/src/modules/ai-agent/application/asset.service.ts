import { Injectable } from '@nestjs/common';
import {
  AssetPipelineResult,
  AssetProvider,
  AssetRequest,
} from '../contracts/asset-provider.interface';
import {
  AssetProviderStepError,
  YouTubeAssetProvider,
} from '../infrastructure/assets/youtube-asset.provider';
import { WikimediaImageProvider } from '../infrastructure/assets/wikimedia-image.provider';

@Injectable()
export class AssetService {
  private readonly providers: AssetProvider[];

  constructor(
    youtubeAssetProvider: YouTubeAssetProvider,
    wikimediaImageProvider: WikimediaImageProvider,
  ) {
    this.providers = [youtubeAssetProvider, wikimediaImageProvider];
  }

  async process(assetRequest?: AssetRequest): Promise<AssetPipelineResult> {
    if (
      !assetRequest ||
      ['text', 'quote', 'emoji', 'timeline'].includes(assetRequest.type)
    ) {
      return { assetStatus: 'NOT_REQUIRED' };
    }

    const resolvedAssetRequest = this.resolveProvider(assetRequest);
    const providerSupport = this.providers.map((provider) => ({
      provider,
      name: provider.constructor.name,
      supports: provider.supports(resolvedAssetRequest),
    }));
    const providers = providerSupport
      .filter((candidate) => candidate.supports)
      .sort(
        (left, right) =>
          this.providerPriority(left.name, resolvedAssetRequest) -
          this.providerPriority(right.name, resolvedAssetRequest),
      )
      .map((candidate) => candidate.provider);

    if (!providers.length) {
      return {
        assetStatus: 'FAILED',
        assetFailureReason: `No asset provider supports ${resolvedAssetRequest.type}/${resolvedAssetRequest.provider ?? 'unspecified'}`,
        assetFailureDiagnostics: providerSupport.map(({ name, supports }) => ({
          provider: name,
          supports,
        })),
      };
    }

    const diagnostics: Record<string, unknown>[] = [];
    for (const provider of providers)
      try {
        const asset = await provider.process(resolvedAssetRequest);

        return {
          assetStatus: 'READY',
          asset,
        };
      } catch (error) {
        if (error instanceof AssetProviderStepError) {
          diagnostics.push({
            provider: resolvedAssetRequest.provider ?? assetRequest.type,
            reason: error.message,
            step: error.step,
            ...error.diagnostics,
          });
        } else {
          diagnostics.push({
            provider: resolvedAssetRequest.provider ?? assetRequest.type,
            reason: error instanceof Error ? error.message : String(error),
          });
        }
      }
    return {
      assetStatus: 'FAILED',
      assetFailureReason: `No ${assetRequest.type} provider returned a valid asset`,
      assetFailureStep:
        assetRequest.type === 'image' ? 'image-search' : undefined,
      assetFailureDiagnostics: diagnostics,
    };
  }

  private resolveProvider(assetRequest: AssetRequest): AssetRequest {
    const type = String(assetRequest.type)
      .trim()
      .toLowerCase() as AssetRequest['type'];
    const provider = assetRequest.provider?.trim().toLowerCase() || undefined;
    const normalizedRequest = { ...assetRequest, type, provider };

    if (provider) return normalizedRequest;

    if (type === 'audio') {
      return {
        ...normalizedRequest,
        provider: 'youtube',
      };
    }

    return normalizedRequest;
  }

  private providerPriority(providerName: string, request: AssetRequest) {
    const normalizedName = providerName.toLowerCase();
    const category = request.categoryType?.trim().toLowerCase();
    const priorities =
      category === 'anime' || category === 'manga'
        ? ['jikan', 'wikimedia']
        : category === 'movie' || category === 'series'
          ? ['tmdb', 'wikimedia']
          : category === 'games'
            ? ['rawg', 'wikimedia']
            : ['wikimedia'];
    const index = priorities.findIndex((name) => normalizedName.includes(name));
    return index === -1 ? priorities.length : index;
  }
}
