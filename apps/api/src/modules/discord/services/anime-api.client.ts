/**
 * AniList GraphQL client for fetching seasonal anime & schedules.
 * Rate limit: 90 requests/min (handled by simple sequential fetching).
 */
export interface AnimeInfo {
  id: number;
  title: { romaji: string; english: string | null; native: string | null };
  coverImage: { large: string; medium: string };
  description: string;
  episodes: number | null;
  duration: number | null;
  status: string;
  season: string;
  seasonYear: number;
  format: string;
  genres: string[];
  averageScore: number | null;
  nextAiringEpisode: {
    id: number;
    episode: number;
    airingAt: number;
    timeUntilAiring: number;
  } | null;
  siteUrl: string;
}

interface GraphQLResponse<T> {
  data: T;
  errors?: { message: string }[];
}

class AnimeApiClient {
  private endpoint = 'https://graphql.anilist.co';

  private async query<T>(
    gql: string,
    variables?: Record<string, any>,
  ): Promise<T> {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query: gql, variables }),
    });
    if (!res.ok) throw new Error(`AniList ${res.status}`);
    const json = (await res.json()) as GraphQLResponse<T>;
    if (json.errors?.length) throw new Error(json.errors[0].message);
    return json.data;
  }

  /** Current season top 25 (by popularity) */
  async getSeasonal(page = 1, perPage = 25): Promise<AnimeInfo[]> {
    const gql = `
      query ($page: Int, $perPage: Int, $season: MediaSeason, $seasonYear: Int) {
        Page(page: $page, perPage: $perPage) {
          media(season: $season, seasonYear: $seasonYear, type: ANIME, sort: POPULARITY_DESC) {
            id
            title { romaji english native }
            coverImage { large medium }
            episodes
            status
            season
            seasonYear
            format
            genres
            averageScore
            siteUrl
            nextAiringEpisode {
              id episode airingAt timeUntilAiring
            }
          }
        }
      }`;
    const now = new Date();
    const data = await this.query<{
      Page: { media: AnimeInfo[] };
    }>(gql, {
      page,
      perPage,
      season: this.currentSeason(),
      seasonYear: now.getFullYear(),
    });
    return data.Page.media;
  }

  /** Get details for a single anime */
  async getAnime(id: number): Promise<AnimeInfo> {
    const gql = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          title { romaji english native }
          coverImage { large medium }
          episodes
          duration
          status
          season seasonYear format
          genres averageScore siteUrl
          nextAiringEpisode {
            id episode airingAt timeUntilAiring
          }
        }
      }`;
    const data = await this.query<{ Media: AnimeInfo }>(gql, { id });
    return data.Media;
  }

  /** Check specific anime's broadcast schedule */
  async getBroadcastSchedule(id: number): Promise<{
    episode: number;
    airingAt: number;
  } | null> {
    const gql = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          nextAiringEpisode { episode airingAt }
        }
      }`;
    const data = await this.query<{
      Media: {
        nextAiringEpisode: { episode: number; airingAt: number } | null;
      };
    }>(gql, { id });
    return data.Media.nextAiringEpisode;
  }

  private currentSeason(): string {
    const m = new Date().getMonth();
    if (m <= 2) return 'WINTER';
    if (m <= 5) return 'SPRING';
    if (m <= 8) return 'SUMMER';
    return 'FALL';
  }
}

let _instance: AnimeApiClient | null = null;

export function getAnimeApi(): AnimeApiClient {
  if (!_instance) _instance = new AnimeApiClient();
  return _instance;
}
