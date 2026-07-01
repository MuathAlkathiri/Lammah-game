export interface SpotifyNormalizedTrack {
  spotifyTrackId: string;
  title: string;
  artist: string;
  albumName: string;
  albumImageUrl?: string;
  spotifyUrl: string;
  previewUrl?: string | null;
  hasPreviewAudio: boolean;
}

export interface MusicGuessQuestion {
  type: 'music_guess';
  question: string;
  answerType: 'text';
  correctAnswer: string;
  acceptedAnswers: string[];
  song: SpotifyNormalizedTrack;
}

export interface SpotifyTrackSeed {
  title: string;
  artist?: string;
}

export interface MusicGuessAnswerValidation {
  isCorrect: boolean;
  normalizedUserAnswer: string;
  normalizedCorrectAnswer: string;
}
