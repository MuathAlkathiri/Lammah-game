"use client";

import type { AxiosError } from "axios";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGamesAwardPoints,
  useGamesCreate,
  useGamesGetById,
  useGamesList,
  useGamesRevealAnswer,
  useGamesSkipQuestion,
} from "@/api/generated/games/games";
import type { ErrorResponseDto } from "@/api/generated/models";
import type { CreateGamePayload, Game } from "@/types";
import { toCreateGameRequest } from "../mappers/game-request.mapper";
import { toGame, toGames } from "../mappers/game-response.mapper";

type GameApiError = AxiosError<ErrorResponseDto>;
type GameMutationOptions = { onSuccess?: (game: Game) => void };

export const gameKeys = {
  all: ["games"] as const,
  detail: (id: string) => ["games", id] as const,
};

function useGameCache(gameId: string) {
  const client = useQueryClient();
  return {
    write(response: { data: Parameters<typeof toGame>[0] }) {
      const game = toGame(response.data);
      client.setQueryData(gameKeys.detail(game.id), game);
      client.invalidateQueries({ queryKey: gameKeys.all });
      return game;
    },
    refreshOnConflict(error: GameApiError) {
      if (error.response?.data.code !== "CONCURRENT_GAME_UPDATE") return;
      client.invalidateQueries({ queryKey: gameKeys.detail(gameId) });
      client.refetchQueries({ queryKey: gameKeys.detail(gameId), exact: true });
    },
  };
}

export const useGames = () =>
  useGamesList({
    query: {
      queryKey: gameKeys.all,
      select: (response) => toGames(response.data),
    },
  });

export const useGame = (id: string) =>
  useGamesGetById(id, {
    query: {
      queryKey: gameKeys.detail(id),
      enabled: Boolean(id),
      select: (response) => toGame(response.data),
    },
  });

export function useCreateGame() {
  const cache = useGameCache("");
  const mutation = useGamesCreate<GameApiError>({
    mutation: { onSuccess: cache.write },
  });
  return {
    ...mutation,
    mutateAsync: (data: CreateGamePayload) =>
      mutation
        .mutateAsync({ data: toCreateGameRequest(data) })
        .then((response) => toGame(response.data)),
  };
}

export function useRevealAnswer(gameId: string) {
  const cache = useGameCache(gameId);
  const mutation = useGamesRevealAnswer<GameApiError>({
    mutation: { onSuccess: cache.write, onError: cache.refreshOnConflict },
  });
  return {
    ...mutation,
    mutate: (questionId: string, options?: GameMutationOptions) =>
      mutation.mutate(
        { id: gameId, data: { questionId } },
        {
          onSuccess: (response) => options?.onSuccess?.(toGame(response.data)),
        },
      ),
    mutateAsync: (questionId: string) =>
      mutation
        .mutateAsync({ id: gameId, data: { questionId } })
        .then((response) => toGame(response.data)),
  };
}

export function useAwardPoints(gameId: string) {
  const cache = useGameCache(gameId);
  const mutation = useGamesAwardPoints<GameApiError>({
    mutation: { onSuccess: cache.write, onError: cache.refreshOnConflict },
  });
  return {
    ...mutation,
    mutate: (
      input: { questionId: string; teamIndex: 0 | 1 },
      options?: GameMutationOptions,
    ) =>
      mutation.mutate(
        { id: gameId, data: input },
        {
          onSuccess: (response) => options?.onSuccess?.(toGame(response.data)),
        },
      ),
    mutateAsync: (input: { questionId: string; teamIndex: 0 | 1 }) =>
      mutation
        .mutateAsync({ id: gameId, data: input })
        .then((response) => toGame(response.data)),
  };
}

export function useSkipQuestion(gameId: string) {
  const cache = useGameCache(gameId);
  const mutation = useGamesSkipQuestion<GameApiError>({
    mutation: { onSuccess: cache.write, onError: cache.refreshOnConflict },
  });
  return {
    ...mutation,
    mutate: (questionId: string, options?: GameMutationOptions) =>
      mutation.mutate(
        { id: gameId, data: { questionId } },
        {
          onSuccess: (response) => options?.onSuccess?.(toGame(response.data)),
        },
      ),
    mutateAsync: (questionId: string) =>
      mutation
        .mutateAsync({ id: gameId, data: { questionId } })
        .then((response) => toGame(response.data)),
  };
}
