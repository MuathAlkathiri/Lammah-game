import { GameResponseMapper } from './game-response.mapper';

describe('GameResponseMapper', () => {
  it('normalizes defaults and removes mongoose version metadata', () => {
    expect(
      GameResponseMapper.toResponse({
        _id: 'game-id',
        name: 'Game',
        status: 'active',
        __v: 2,
      }),
    ).toEqual({
      _id: 'game-id',
      name: 'Game',
      status: 'active',
      teams: [],
      selectedCategories: [],
      board: [],
      currentTurnTeamIndex: 0,
    });
  });
});
