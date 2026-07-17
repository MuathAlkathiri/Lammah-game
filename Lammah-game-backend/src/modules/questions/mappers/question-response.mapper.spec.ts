import { QuestionResponseMapper } from './question-response.mapper';

describe('QuestionResponseMapper', () => {
  it('normalizes ids, missing arrays and removes mongoose version metadata', () => {
    const response = QuestionResponseMapper.toResponse({
      _id: { toString: () => 'question-id' },
      question: 'Question?',
      status: 'draft',
      source: 'ai',
      __v: 4,
    });

    expect(response).toEqual({
      _id: 'question-id',
      question: 'Question?',
      status: 'draft',
      source: 'ai',
      wrongAnswers: [],
    });
  });

  it('removes local storage paths from public asset metadata', () => {
    const response = QuestionResponseMapper.toResponse({
      _id: 'question-id',
      question: 'Question?',
      status: 'draft',
      source: 'ai',
      primaryAsset: {
        type: 'image',
        url: '/uploads/image.webp',
        source: 'wikimedia',
        localPath: '/private/uploads/image.webp',
      },
    });

    expect(response.primaryAsset).toEqual({
      type: 'image',
      url: '/uploads/image.webp',
      source: 'wikimedia',
    });
  });

  it('strips Wigolo verification metadata from question DTOs', () => {
    const response = QuestionResponseMapper.toResponse({
      _id: 'question-id',
      question: 'Question?',
      status: 'draft',
      source: 'ai',
      verificationDiagnostics: {
        verificationProvider: 'wigolo',
        evidenceSourceCount: 2,
      },
      aiMetadata: {
        verificationDiagnostics: {
          confidence: 0.9,
          sourceDomains: ['music.apple.com'],
        },
      },
      verificationProvider: 'wigolo',
      verificationStatus: 'VERIFIED',
      verificationCacheHit: true,
      evidenceSourceCount: 2,
      sourceDomains: ['music.apple.com'],
      confidence: { overall: 0.9 },
    });

    const serialized = JSON.stringify(response);
    expect(serialized).not.toContain('wigolo');
    expect(serialized).not.toContain('verification');
    expect(serialized).not.toContain('music.apple.com');
    expect(serialized).not.toContain('confidence');
  });
});
