import { GameResponseDto } from '../dto/game-response.dto';

export class GameResponseMapper {
  static toResponse(value: unknown): GameResponseDto {
    const source = this.toPlain(value);
    const { __v: _version, ...safe } = source;
    void _version;
    return {
      ...safe,
      _id: String(safe._id ?? ''),
      name: String(safe.name ?? ''),
      status: String(safe.status ?? ''),
      teams: Array.isArray(safe.teams) ? safe.teams : [],
      selectedCategories: Array.isArray(safe.selectedCategories)
        ? safe.selectedCategories
        : [],
      board: Array.isArray(safe.board) ? safe.board : [],
      currentTurnTeamIndex: Number(safe.currentTurnTeamIndex ?? 0),
    } as GameResponseDto;
  }

  static toResponseList(values: unknown[]): GameResponseDto[] {
    return values.map((value) => this.toResponse(value));
  }

  private static toPlain(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && 'toObject' in value)
      return (value as { toObject(): Record<string, unknown> }).toObject();
    return (value ?? {}) as Record<string, unknown>;
  }
}
