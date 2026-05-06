/**
 * HTTP client for the LeetCode API (leetcode-api-pied.vercel.app).
 */
export interface LeetcodeDaily {
  date: string;
  link: string;
  question: {
    questionId: string;
    questionFrontendId: string;
    title: string;
    titleSlug: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    acRate: number;
    topicTags: { name: string; slug: string }[];
    content: string;
  };
}

export interface LeetcodeRandom {
  id: string;
  frontend_id: string;
  title: string;
  title_slug: string;
  difficulty: string;
  url: string;
}

export interface LeetcodeUserProfile {
  username: string;
  profile: {
    userAvatar: string;
    realName: string;
    ranking: number;
  };
  submitStats: {
    acSubmissionNum: {
      difficulty: string;
      count: number;
      submissions: number;
    }[];
  };
}

export interface LeetcodeContest {
  title: string;
  titleSlug: string;
  startTime: number;
  duration: number;
}

export interface LeetcodeContestsResponse {
  topTwoContests: LeetcodeContest[];
}

class LeetCodeApiClient {
  private baseUrl = 'https://leetcode-api-pied.vercel.app';

  private async fetch<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`);
    if (!res.ok) {
      throw new Error(`LeetCode API ${res.status}: ${res.statusText}`);
    }
    return res.json() as Promise<T>;
  }

  getDaily(): Promise<LeetcodeDaily> {
    return this.fetch('/daily');
  }

  getRandom(difficulty?: string, tags?: string): Promise<LeetcodeRandom> {
    const params = new URLSearchParams();
    if (difficulty) params.set('difficulty', difficulty);
    if (tags) params.set('tags', tags);
    const qs = params.toString();
    return this.fetch(`/random${qs ? `?${qs}` : ''}`);
  }

  getUser(username: string): Promise<LeetcodeUserProfile> {
    return this.fetch(`/user/${encodeURIComponent(username)}`);
  }

  getContests(): Promise<LeetcodeContestsResponse> {
    return this.fetch('/contests');
  }
}

let _instance: LeetCodeApiClient | null = null;

export function getLeetcodeApi(): LeetCodeApiClient {
  if (!_instance) _instance = new LeetCodeApiClient();
  return _instance;
}
