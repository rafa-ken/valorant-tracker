import { http } from "./http";
import type { ContentResponse, LeaderboardResponse, SkinsResponse } from "./types";

export const api = {
  content: (region: string, locale = "pt-BR") => http<ContentResponse>("/content", { region, locale }),
  leaderboard: (actId: string, opts: { region: string; size?: number; startIndex?: number }) =>
    http<LeaderboardResponse>("/leaderboard", { actId, ...opts }),
  skins: (params: { language?: string; q?: string; weaponUuid?: string } = {}) =>
    http<SkinsResponse>("/skins", params as any),
};
