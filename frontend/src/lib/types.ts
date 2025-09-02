export type Act = { id: string; name: string; isActive?: boolean };
export type ContentResponse = { acts: Act[]; characters?: any[]; maps?: any[]; gameModes?: any[] };

export type Player = {
  puuid?: string;
  gameName?: string;
  tagLine?: string;
  leaderboardRank?: number;
  rankedRating?: number;
  numberOfWins?: number;
  competitiveTier?: number;
};

export type LeaderboardResponse = {
  players: Player[];
  totalPlayers?: number;
  startIndex?: number;
};

export type SkinsResponse = {
  skins: Array<{
    uuid: string;
    displayName: string;
    displayIcon?: string;
    fullRender?: string;
    levels?: any[];
    chromas?: any[];
  }>;
};
