import { describe, expect, it } from "vitest";
import { toLoginRequest, toRegisterRequest } from "@/features/auth/mappers/auth-request.mapper";
import { toCreateGameRequest } from "@/features/games/mappers/game-request.mapper";
import { toGenerateReviewedRequest } from "@/features/ai-generation/mappers/ai-generation-request.mapper";
import { toMusicUploadRequest } from "@/features/music/mappers/music-request.mapper";

describe("request mappers", () => {
  it("maps auth values exactly", () => {
    expect(toLoginRequest({ email: "a@example.invalid", password: "pw" })).toEqual({
      email: "a@example.invalid",
      password: "pw",
    });
    expect(
      toRegisterRequest({
        fullName: "Fixture User",
        email: "a@example.invalid",
        password: "pw",
      }),
    ).toEqual({
      fullName: "Fixture User",
      email: "a@example.invalid",
      password: "pw",
    });
  });

  it("preserves team and category ordering for game creation", () => {
    expect(
      toCreateGameRequest({
        name: "Game",
        teams: [
          { name: "A", members: [] },
          { name: "B", members: [] },
        ],
        categoryIds: ["c2", "c1"],
      }),
    ).toEqual({
      name: "Game",
      teams: [
        { name: "A", members: [] },
        { name: "B", members: [] },
      ],
      categoryIds: ["c2", "c1"],
    });
  });

  it("applies reviewed-generation defaults and omits empty names", () => {
    expect(toGenerateReviewedRequest({ categoryId: "category-1" })).toEqual({
      categoryId: "category-1",
      count: 2,
      difficulty: "medium",
      language: "ar",
    });
  });

  it("maps synthetic music upload values to the generated body", () => {
    const file = new File([new Uint8Array([0, 1, 2])], "tone.wav", {
      type: "audio/wav",
    });
    expect(
      toMusicUploadRequest(file, {
        title: "Tone",
        artist: "Fixture",
        language: "ar",
        difficulty: "easy",
        snippetStartSecond: 1,
        snippetDurationSeconds: 5,
      }),
    ).toMatchObject({
      file,
      title: "Tone",
      artist: "Fixture",
      snippetStartSecond: 1,
      snippetDurationSeconds: 5,
    });
  });
});
