import { QuestionResponseDto } from '../dto/question-response.dto';

export class QuestionResponseMapper {
  static toResponse(value: unknown): QuestionResponseDto {
    const source = this.toPlainObject(value);
    const {
      __v: _version,
      verificationDiagnostics: _verificationDiagnostics,
      aiMetadata: _aiMetadata,
      verificationProvider: _verificationProvider,
      verificationStatus: _verificationStatus,
      verificationCacheHit: _verificationCacheHit,
      evidenceSourceCount: _evidenceSourceCount,
      sourceDomains: _sourceDomains,
      confidence: _confidence,
      ...safe
    } = source;
    void _version;
    void _verificationDiagnostics;
    void _aiMetadata;
    void _verificationProvider;
    void _verificationStatus;
    void _verificationCacheHit;
    void _evidenceSourceCount;
    void _sourceDomains;
    void _confidence;
    const primaryAsset = this.safeAsset(safe.primaryAsset);
    const coverImage = this.safeAsset(safe.coverImage);
    const category = this.safeRelatedDocument(safe.category);
    return {
      ...safe,
      ...(safe.category !== undefined ? { category } : {}),
      ...(safe.primaryAsset !== undefined ? { primaryAsset } : {}),
      ...(safe.coverImage !== undefined ? { coverImage } : {}),
      _id: String(safe._id ?? ''),
      question: String(safe.question ?? ''),
      wrongAnswers: Array.isArray(safe.wrongAnswers) ? safe.wrongAnswers : [],
      status: String(safe.status ?? ''),
      source: String(safe.source ?? ''),
    } as QuestionResponseDto;
  }

  static toResponseList(values: unknown[]): QuestionResponseDto[] {
    return values.map((value) => this.toResponse(value));
  }

  private static safeAsset(value: unknown): unknown {
    if (!value || typeof value !== 'object') return value;
    const { localPath: _localPath, ...safe } = value as Record<string, unknown>;
    void _localPath;
    return safe;
  }

  private static safeRelatedDocument(value: unknown): unknown {
    if (!value || typeof value !== 'object') return value;
    const source = this.toPlainObject(value);
    const { __v: _version, ...safe } = source;
    void _version;
    return safe;
  }

  private static toPlainObject(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && 'toObject' in value) {
      const document = value as { toObject(): Record<string, unknown> };
      return document.toObject();
    }
    return (value ?? {}) as Record<string, unknown>;
  }
}
