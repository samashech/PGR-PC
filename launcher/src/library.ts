export type Game = {
  id: string;
  title: string;
  imageHeight: number;
  imageWidth?: number;
  completion: number;
  playtime: number;
  path: string;
  cover_url: string | null;
  is_steam: boolean;
  x?: number;
  y?: number;
  favorite?: boolean;
  last_played?: number;
};
export type Filter = "all" | "favorites" | "steam" | "local";
export type Sort = "title" | "recent" | "playtime";

export function selectGames(
  games: Game[],
  query: string,
  filter: Filter,
  sort: Sort,
): Game[] {
  const search = query.trim().toLocaleLowerCase();
  return games
    .filter(
      (game) =>
        game.title.toLocaleLowerCase().includes(search) &&
        (filter !== "favorites" || game.favorite) &&
        (filter !== "steam" || game.is_steam) &&
        (filter !== "local" || !game.is_steam),
    )
    .sort(
      (a, b) =>
        (sort === "recent"
          ? (b.last_played || 0) - (a.last_played || 0)
          : sort === "playtime"
            ? b.playtime - a.playtime
            : 0) || a.title.localeCompare(b.title),
    );
}

export function formatPlaytime(hours: number): string {
  if (hours <= 0) return "Not played yet";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min played`;
  return `${hours.toFixed(1)} hrs played`;
}
