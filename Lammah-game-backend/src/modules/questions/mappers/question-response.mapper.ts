import { QuestionResponseDto } from '../dto/question-response.dto';

export class QuestionResponseMapper {
  static toResponse(value: unknown): QuestionResponseDto {
    const source = this.toPlainObject(value);
    const { __v: _version, ...safe } = source;
    void _version;
    const primaryAsset = this.safeAsset(safe.primaryAsset);
    const coverImage = this.safeAsset(safe.coverImage);
    return {
      ...safe,
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

  private static toPlainObject(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && 'toObject' in value) {
      const document = value as { toObject(): Record<string, unknown> };
      return document.toObject();
    }
    return (value ?? {}) as Record<string, unknown>;
  }
}
