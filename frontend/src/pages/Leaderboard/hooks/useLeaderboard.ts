import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";

export function useLeaderboard(region: string, actId: string, page: number, pageSize = 50) {
  const startIndex = page * pageSize;
  return useQuery({
    queryKey: ["leaderboard", region, actId, startIndex, pageSize],
    queryFn: () => api.leaderboard(actId, { region, size: pageSize, startIndex }),
    enabled: Boolean(region && actId),
    staleTime: 30000,
  });
}
