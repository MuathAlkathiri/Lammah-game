import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MusicGuessAnswerValidation,
  MusicGuessQuestion,
  SpotifyNormalizedTrack,
  SpotifyTrackSeed,
} from './types/spotify.types';

interface SpotifyTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface SpotifySearchResponse {
  tracks?: {
    items?: SpotifyTrack[];
  };
  error?: {
    status?: number;
    message?: string;
  };
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: {
    name: string;
  }[];
  album: {
    name: string;
    images?: {
      url: string;
      height?: number;
      width?: number;
    }[];
  };
  external_urls: {
    spotify: string;
  };
  preview_url?: string | null;
}

@Injectable()
export class MusicService {
  private static readonly DEFAULT_SPOTIFY_TRACK_SEEDS: SpotifyTrackSeed[] = [
    { title: 'الأماكن', artist: 'محمد عبده' },
    { title: 'مذهلة', artist: 'محمد عبده' },
    { title: 'سكة سفر', artist: 'راشد الماجد' },
    { title: 'الأغاني القديمة', artist: 'عبدالمجيد عبدالله' },
    { title: 'يا بعدهم', artist: 'عبدالمجيد عبدالله' },
    { title: 'وين أحب الليلة', artist: 'عبادي الجوهر' },
    { title: 'بنت النور', artist: 'محمد عبده' },
    { title: 'يا طيب القلب', artist: 'راشد الماجد' },
    { title: 'مقادير', artist: 'طلال مداح' },
    { title: 'أنا بتبع قلبي', artist: 'طلال مداح' },
  ];

  private spotifyAccessToken?: string;
  private spotifyTokenExpiresAt = 0;

  constructor(private readonly configService: ConfigService) {}

  async searchTrack(
    title: string,
    artist?: string,
  ): Promise<SpotifyNormalizedTrack> {
    const cleanTitle = title.trim();
    const cleanArtist = artist?.trim();

    if (!cleanTitle) {
      throw new BadRequestException('Title is required');
    }

    const token = await this.getSpotifyAccessToken();
    const market = this.configService.get<string>('SPOTIFY_MARKET') ?? 'SA';
    const query = cleanArtist ? `${cleanTitle} ${cleanArtist}` : cleanTitle;
    const searchParams = new URLSearchParams({
      q: query,
      type: 'track',
      limit: '5',
      market,
    });

    const response = await fetch(
      `https://api.spotify.com/v1/search?${searchParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data =
      await this.readSpotifyResponse<SpotifySearchResponse>(response);

    if (response.status === HttpStatus.TOO_MANY_REQUESTS) {
      throw new HttpException(
        'Spotify rate limit exceeded. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!response.ok) {
      throw new InternalServerErrorException(
        `Spotify search failed: ${
          data.error?.message ??
          data.rawMessage ??
          `Spotify returned ${response.status}`
        }`,
      );
    }

    const tracks = data.tracks?.items ?? [];
    const bestTrack = this.pickBestTrackMatch(tracks, cleanTitle, cleanArtist);

    if (!bestTrack) {
      throw new NotFoundException(
        cleanArtist
          ? `Spotify track not found for "${cleanTitle}" by "${cleanArtist}"`
          : `Spotify track not found for "${cleanTitle}"`,
      );
    }

    return this.normalizeSpotifyTrack(bestTrack);
  }

  async generateMusicGuessQuestionFromSpotifyTrack(
    title: string,
    artist?: string,
  ): Promise<MusicGuessQuestion> {
    const song = await this.searchTrack(title, artist);

    return {
      type: 'music_guess',
      question: 'Listen to the song preview and type the song name.',
      answerType: 'text',
      correctAnswer: song.title,
      acceptedAnswers: this.buildAcceptedAnswers(song.title),
      song,
    };
  }

  async generateSeededMusicGuessQuestions(
    count: number,
  ): Promise<MusicGuessQuestion[]> {
    const seeds = this.getSpotifyTrackSeeds();

    if (seeds.length === 0) {
      throw new InternalServerErrorException(
        'No Spotify seed tracks configured for music question generation.',
      );
    }

    const selectedSeeds = this.pickSeedTracks(seeds, count);
    const questions: MusicGuessQuestion[] = [];

    for (const seed of selectedSeeds) {
      questions.push(
        await this.generateMusicGuessQuestionFromSpotifyTrack(
          seed.title,
          seed.artist,
        ),
      );
    }

    return questions;
  }

  validateMusicGuessAnswer(
    userAnswer: string,
    correctAnswer: string,
  ): MusicGuessAnswerValidation {
    const normalizedUserAnswer = this.normalizeAnswer(userAnswer);
    const normalizedCorrectAnswer = this.normalizeAnswer(correctAnswer);

    if (!normalizedUserAnswer) {
      throw new BadRequestException('User answer is required');
    }

    if (!normalizedCorrectAnswer) {
      throw new BadRequestException('Correct answer is required');
    }

    return {
      isCorrect: normalizedUserAnswer === normalizedCorrectAnswer,
      normalizedUserAnswer,
      normalizedCorrectAnswer,
    };
  }

  private async getSpotifyAccessToken(): Promise<string> {
    this.ensureSpotifyConfig();

    const now = Date.now();
    if (this.spotifyAccessToken && now < this.spotifyTokenExpiresAt) {
      return this.spotifyAccessToken;
    }

    const clientId = this.configService.get<string>('SPOTIFY_CLIENT_ID')!;
    const clientSecret = this.configService.get<string>(
      'SPOTIFY_CLIENT_SECRET',
    )!;
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64',
    );

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
      }).toString(),
    });

    const data = await this.readSpotifyResponse<SpotifyTokenResponse>(response);

    if (response.status === HttpStatus.TOO_MANY_REQUESTS) {
      throw new HttpException(
        'Spotify rate limit exceeded while requesting an access token.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!response.ok || !data.access_token || !data.expires_in) {
      throw new InternalServerErrorException(
        `Spotify token request failed: ${
          data.error_description ??
          data.error ??
          data.rawMessage ??
          `Spotify returned ${response.status}`
        }`,
      );
    }

    this.spotifyAccessToken = data.access_token;
    this.spotifyTokenExpiresAt = now + (data.expires_in - 60) * 1000;

    return this.spotifyAccessToken;
  }

  private ensureSpotifyConfig() {
    const clientId = this.configService.get<string>('SPOTIFY_CLIENT_ID');
    const clientSecret = this.configService.get<string>(
      'SPOTIFY_CLIENT_SECRET',
    );

    if (!clientId || !clientSecret) {
      throw new InternalServerErrorException(
        'Spotify is not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.',
      );
    }
  }

  private async readSpotifyResponse<T>(
    response: Response,
  ): Promise<T & { rawMessage?: string }> {
    const text = await response.text();

    if (!text) {
      return {} as T & { rawMessage?: string };
    }

    try {
      return JSON.parse(text) as T & { rawMessage?: string };
    } catch {
      return {
        rawMessage: text,
      } as T & { rawMessage: string };
    }
  }

  private pickBestTrackMatch(
    tracks: SpotifyTrack[],
    title: string,
    artist?: string,
  ): SpotifyTrack | undefined {
    if (tracks.length === 0) {
      return undefined;
    }

    const normalizedTitle = this.normalizeAnswer(title);
    const normalizedArtist = artist ? this.normalizeAnswer(artist) : undefined;

    return [...tracks].sort((a, b) => {
      const scoreA = this.scoreTrackMatch(a, normalizedTitle, normalizedArtist);
      const scoreB = this.scoreTrackMatch(b, normalizedTitle, normalizedArtist);

      return scoreB - scoreA;
    })[0];
  }

  private scoreTrackMatch(
    track: SpotifyTrack,
    normalizedTitle: string,
    normalizedArtist?: string,
  ): number {
    const trackTitle = this.normalizeAnswer(track.name);
    const trackArtists = track.artists.map((artist) =>
      this.normalizeAnswer(artist.name),
    );

    let score = 0;

    if (trackTitle === normalizedTitle) {
      score += 100;
    } else if (
      trackTitle.includes(normalizedTitle) ||
      normalizedTitle.includes(trackTitle)
    ) {
      score += 50;
    }

    if (normalizedArtist) {
      if (trackArtists.some((artist) => artist === normalizedArtist)) {
        score += 80;
      } else if (
        trackArtists.some(
          (artist) =>
            artist.includes(normalizedArtist) ||
            normalizedArtist.includes(artist),
        )
      ) {
        score += 35;
      }
    }

    return score;
  }

  private normalizeSpotifyTrack(track: SpotifyTrack): SpotifyNormalizedTrack {
    const albumImageUrl = track.album.images?.[0]?.url;
    const previewUrl = track.preview_url ?? null;

    return {
      spotifyTrackId: track.id,
      title: track.name,
      artist: track.artists.map((artist) => artist.name).join(', '),
      albumName: track.album.name,
      albumImageUrl,
      spotifyUrl: track.external_urls.spotify,
      previewUrl,
      hasPreviewAudio: !!previewUrl,
    };
  }

  private buildAcceptedAnswers(title: string): string[] {
    const normalizedTitle = this.normalizeAnswer(title);

    return normalizedTitle === title
      ? [title]
      : Array.from(new Set([title, normalizedTitle]));
  }

  private getSpotifyTrackSeeds(): SpotifyTrackSeed[] {
    const rawSeeds = this.configService.get<string>('SPOTIFY_SEED_TRACKS');

    if (!rawSeeds) {
      return MusicService.DEFAULT_SPOTIFY_TRACK_SEEDS;
    }

    try {
      const parsed = JSON.parse(rawSeeds) as SpotifyTrackSeed[];

      if (!Array.isArray(parsed)) {
        throw new Error('SPOTIFY_SEED_TRACKS must be a JSON array');
      }

      const seeds: SpotifyTrackSeed[] = [];

      for (const seed of parsed) {
        const seedTitle = seed.title?.trim();

        if (seedTitle) {
          seeds.push({
            title: seedTitle,
            artist: seed.artist?.trim(),
          });
        }
      }

      return seeds;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        `Invalid SPOTIFY_SEED_TRACKS configuration: ${errorMessage}`,
      );
    }
  }

  private pickSeedTracks(
    seeds: SpotifyTrackSeed[],
    count: number,
  ): SpotifyTrackSeed[] {
    const shuffledSeeds = [...seeds].sort(() => Math.random() - 0.5);
    const selectedSeeds: SpotifyTrackSeed[] = [];

    while (selectedSeeds.length < count) {
      selectedSeeds.push(
        shuffledSeeds[selectedSeeds.length % shuffledSeeds.length],
      );
    }

    return selectedSeeds;
  }

  private normalizeAnswer(answer: string): string {
    return answer
      .normalize('NFKC')
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
      .replace(/[\p{P}\p{S}]/gu, ' ')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }
}
