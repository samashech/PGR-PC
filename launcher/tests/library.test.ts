import { test } from "node:test";
import assert from "node:assert/strict";
import { selectGames, formatPlaytime, type Game } from "../src/library.ts";
const game = (
  id: string,
  title: string,
  overrides: Partial<Game> = {},
): Game => ({
  id,
  title,
  imageHeight: 250,
  completion: 0,
  playtime: 0,
  path: id,
  cover_url: null,
  is_steam: false,
  ...overrides,
});
const games = [
  game("1", "Zelda", { favorite: true, playtime: 8 }),
  game("2", "Portal", { is_steam: true, last_played: 20 }),
  game("3", "Celeste", { last_played: 40, playtime: 2 }),
];
test("search is trimmed and case insensitive and composes with filters", () => {
  assert.deepEqual(
    selectGames(games, "  PORT ", "steam", "title").map((g) => g.id),
    ["2"],
  );
  assert.equal(selectGames(games, "Portal", "local", "title").length, 0);
  assert.deepEqual(
    selectGames(games, "", "favorites", "title").map((g) => g.id),
    ["1"],
  );
});
test("sorting handles legacy games without recency or favorite fields without mutating input", () => {
  assert.deepEqual(
    selectGames(games, "", "all", "recent").map((g) => g.id),
    ["3", "2", "1"],
  );
  assert.deepEqual(
    selectGames(games, "", "all", "playtime").map((g) => g.id),
    ["1", "3", "2"],
  );
  assert.deepEqual(
    selectGames(games, "", "all", "title").map((g) => g.id),
    ["3", "2", "1"],
  );
  assert.deepEqual(
    games.map((g) => g.id),
    ["1", "2", "3"],
  );
});
test("short sessions are distinguishable from unplayed games", () => {
  assert.equal(formatPlaytime(0), "Not played yet");
  assert.equal(formatPlaytime(0.001), "1 min played");
  assert.equal(formatPlaytime(0.5), "30 min played");
  assert.equal(formatPlaytime(1.5), "1.5 hrs played");
});
