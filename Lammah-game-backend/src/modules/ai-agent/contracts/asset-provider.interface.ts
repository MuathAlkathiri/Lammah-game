export type QuestionAssetType =
  'text' | 'image' | 'audio' | 'quote' | 'emoji' | 'timeline';

export type GameMode =
  | 'trivia'
  | 'identifyCharacter'
  | 'identifyVoice'
  | 'identifyImage'
  | 'completeQuote'
  | 'timeline'
  | 'emojiPuzzle'
  | 'identifySong'
  | 'identifySinger'
  | 'identifyMusicIntro';

export type AssetStatus = 'NOT_REQUIRED' | 'PENDING' | 'READY' | 'FAILED';

export type AssetRequest = {
  type: QuestionAssetType;
  assetType?: QuestionAssetType;
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
  entityType?:
    | 'character'
    | 'location'
    | 'person'
    | 'franchise'
    | 'logo'
    | 'event'
    | 'game'
    | string;
  visualHint?: string;
  categoryType?:
    'anime' | 'manga' | 'movie' | 'series' | 'history' | 'games' | string;
  purpose?: 'gameplay' | 'decorative';
  duration?: number;
  speaker?: string;
  [key: string]: unknown;
};

export type AssetMetadata = {
  localPath: string;
  url: string;
  duration?: number;
  source: string;
  sourceUrl?: string;
  searchQuery?: string;
  provider: string;
  type: QuestionAssetType;
  metadata?: Record<string, unknown>;
};

export type AssetPipelineResult =
  | {
      assetStatus: 'READY';
      asset: AssetMetadata;
    }
  | {
      assetStatus: 'FAILED';
      assetFailureReason: string;
      assetFailureStep?: string;
      assetFailureDiagnostics?:
        Record<string, unknown> | Record<string, unknown>[];
    }
  | {
      assetStatus: 'NOT_REQUIRED';
    };

export interface AssetProvider {
  supports(assetRequest: AssetRequest): boolean;
  process(assetRequest: AssetRequest): Promise<AssetMetadata>;
}
