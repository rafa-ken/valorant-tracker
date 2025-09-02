import { http } from "./http";

export const api = {
  content: (region: string, locale = "pt-BR") => http("/content", { region, locale }),
  leaderboard: (actId: string, opts: { region: string; size?: number; startIndex?: number }) =>
    http("/leaderboard", { actId, ...opts }),
  skins: (params: { language?: string; q?: string; weaponUuid?: string } = {}) => http("/skins", params as any),

  // NOVO:
  weapons: (language = "pt-BR") => http("/weapons", { language }),
  weaponSkins: (weaponUuid: string, language = "pt-BR") =>
    http(`/weapons/${weaponUuid}/skins`, { language }),
};
