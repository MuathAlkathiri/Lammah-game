import {
  AssetMetadata,
  AssetProvider,
  AssetRequest,
} from '../contracts/asset-provider.interface';
import { AssetService } from '../application/asset.service';
import { WikimediaImageProvider } from '../infrastructure/assets/wikimedia-image.provider';
import { YouTubeAssetProvider } from '../infrastructure/assets/youtube-asset.provider';

class StubProvider implements AssetProvider {
  constructor(
    private readonly type: 'audio' | 'image',
    private readonly providerName: string,
  ) {}

  supports(request: AssetRequest): boolean {
    return (
      request.type === this.type &&
      (!request.provider || request.provider === this.providerName)
    );
  }

  async process(request: AssetRequest): Promise<AssetMetadata> {
    return {
      type: request.type,
      localPath: 'question-assets/test',
      url: '/uploads/question-assets/test',
      source: this.providerName,
      provider: this.providerName,
    };
  }
}

describe('AssetService provider selection', () => {
  const createService = () =>
    new AssetService(
      new StubProvider('audio', 'youtube') as unknown as YouTubeAssetProvider,
      new StubProvider(
        'image',
        'wikimedia',
      ) as unknown as WikimediaImageProvider,
    );

  it('selects Wikimedia for an image request without an explicit provider', async () => {
    const result = await createService().process({
      type: 'image',
      entity: 'Naruto',
    });
    expect(result.assetStatus).toBe('READY');
    if (result.assetStatus === 'READY')
      expect(result.asset.provider).toBe('wikimedia');
  });

  it('normalizes runtime type and provider values before selection', async () => {
    const result = await createService().process({
      type: ' Image ' as AssetRequest['type'],
      provider: ' Wikimedia ',
    });
    expect(result.assetStatus).toBe('READY');
    if (result.assetStatus === 'READY')
      expect(result.asset.provider).toBe('wikimedia');
  });

  it('keeps YouTube as the default audio provider', async () => {
    const result = await createService().process({
      type: 'audio',
      entity: 'Kankuro',
    });
    expect(result.assetStatus).toBe('READY');
    if (result.assetStatus === 'READY')
      expect(result.asset.provider).toBe('youtube');
  });
});
