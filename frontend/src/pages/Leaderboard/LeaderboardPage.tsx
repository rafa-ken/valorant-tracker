import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { Player } from "../../lib/types";

const REGIONS = ["br", "na", "eu", "ap", "kr", "latam"] as const;
const PAGE_SIZE = 50;

// Tipos enxutos para o que precisamos da rota /content
type AnyEntry = {
  id: string;
  name: string;
  type?: string;      // "episode" | "act" | ...
  isActive?: boolean;
  parentId?: string;  // quando presente, liga act->episode
};

export default function LeaderboardPage() {
  const [region, setRegion] = useState<(typeof REGIONS)[number]>("br");

  // conteúdo
  const [episodes, setEpisodes] = useState<AnyEntry[]>([]);
  const [acts, setActs] = useState<AnyEntry[]>([]);

  // seleção
  const [episodeId, setEpisodeId] = useState<string>("");
  const [actId, setActId] = useState<string>("");

  // lista contínua
  const [players, setPlayers] = useState<Player[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // util: tenta inferir a qual episódio o act pertence (fallback por nome)
  function inferEpisodeIdForAct(act: AnyEntry, eps: AnyEntry[]): string | undefined {
    if (act.parentId) return act.parentId;
    const aName = (act.name || "").toLowerCase();
    // tenta bater por substring do nome do episódio
    const hit = eps.find((e) => aName.includes((e.name || "").toLowerCase()));
    return hit?.id;
  }

  // Carrega episodes + acts do /content e define seleções padrão
  useEffect(() => {
    let alive = true;
    setError(null);

    api
      .content(region, "pt-BR")
      .then((d) => {
        if (!alive) return;
        const all = (d.acts || []) as AnyEntry[];

        const eps = all.filter((x) => (x.type ?? "").toLowerCase() === "episode");
        const onlyActs = all.filter((x) => (x.type ?? "").toLowerCase() === "act");

        // liga acts aos episódios (usando parentId quando existe; senão inferência por nome)
        const linkedActs = onlyActs.map((a) => ({
          ...a,
          parentId: a.parentId || inferEpisodeIdForAct(a, eps),
        }));

        setEpisodes(eps);
        setActs(linkedActs);

        // seleciona episódio ativo se existir, senão o mais recente
        const epActive = eps.find((e) => e.isActive) || eps[eps.length - 1];
        const chosenEpisodeId = epActive?.id || eps[0]?.id || "";
        setEpisodeId(chosenEpisodeId);

        // dentro do episódio, escolhe o act ativo; senão o mais recente
        const actsOfEpisode = linkedActs.filter((a) => a.parentId === chosenEpisodeId);
        const actActive = actsOfEpisode.find((a) => a.isActive) || actsOfEpisode[actsOfEpisode.length - 1];
        setActId(actActive?.id || "");

        // reset lista
        setPlayers([]);
        setPage(0);
        setCanLoadMore(true);
      })
      .catch((e) => setError(String(e)));

    return () => {
      alive = false;
    };
  }, [region]);

  // ao trocar episódio, filtra acts e seleciona um default (ativo -> mais recente)
  useEffect(() => {
    if (!episodeId) return;
    const actsOfEpisode = acts.filter((a) => a.parentId === episodeId);
    const actActive = actsOfEpisode.find((a) => a.isActive) || actsOfEpisode[actsOfEpisode.length - 1];
    setActId(actActive?.id || "");
    // reset lista
    setPlayers([]);
    setPage(0);
    setCanLoadMore(true);
  }, [episodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ao trocar act, resetar lista
  useEffect(() => {
    setPlayers([]);
    setPage(0);
    setCanLoadMore(true);
  }, [actId]);

  // carrega uma página e acumula; fallback BR -> LATAM se primeira página vier vazia
  useEffect(() => {
    if (!actId) return;
    let canceled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const startIndex = page * PAGE_SIZE;
        let data = await api.leaderboard(actId, { region, size: PAGE_SIZE, startIndex });
        let chunk: Player[] = data.players || [];

        if (region === "br" && page === 0 && chunk.length === 0) {
          const alt = await api.leaderboard(actId, { region: "latam", size: PAGE_SIZE, startIndex: 0 });
          if (!canceled && (alt.players?.length ?? 0) > 0) {
            chunk = alt.players!;
            setRegion("latam"); // indica visualmente que caiu no fallback
          }
        }

        if (!canceled) {
          setPlayers((prev) => [...prev, ...chunk]);
          setCanLoadMore(chunk.length === PAGE_SIZE);
        }
      } catch (e: any) {
        if (!canceled) setError(String(e));
      } finally {
        if (!canceled) setLoading(false);
      }
    };

    load();
    return () => {
      canceled = true;
    };
  }, [region, actId, page]);

  // acts filtrados pelo episódio selecionado (e com ordenação simples)
  const actsForCurrentEpisode = acts
    .filter((a) => a.parentId === episodeId)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Leaderboard</h2>

      <div className="flex flex-wrap gap-3 items-center">
        {/* Região */}
        <select
          className="bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2"
          value={region}
          onChange={(e) => setRegion(e.target.value as any)}
        >
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r.toUpperCase()}
            </option>
          ))}
        </select>

        {/* Episódio */}
        <select
          className="bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 min-w-[200px]"
          value={episodeId}
          onChange={(e) => setEpisodeId(e.target.value)}
          disabled={episodes.length === 0}
        >
          {episodes.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>

        {/* Act dentro do episódio */}
        <select
          className="bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 min-w-[200px]"
          value={actId}
          onChange={(e) => setActId(e.target.value)}
          disabled={actsForCurrentEpisode.length === 0}
        >
          {actsForCurrentEpisode.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-red-600 bg-red-900/30 p-3 text-red-200">{error}</div>
      )}

      <div className="text-sm text-neutral-400">
        {loading && players.length === 0 ? "Carregando…" : `${players.length} jogadores carregados`}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900/70">
            <tr className="text-left">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Jogador</th>
              <th className="px-3 py-2 text-right">RR</th>
              <th className="px-3 py-2 text-right">Vitórias</th>
              <th className="px-3 py-2 text-right">Tier</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr
                key={p.puuid ?? `${p.gameName}:${p.tagLine}:${p.leaderboardRank}`}
                className="odd:bg-neutral-900/30"
              >
                <td className="px-3 py-2">{p.leaderboardRank ?? "-"}</td>
                <td className="px-3 py-2">{(p.gameName ?? "??") + "#" + (p.tagLine ?? "??")}</td>
                <td className="px-3 py-2 text-right">{p.rankedRating ?? "-"}</td>
                <td className="px-3 py-2 text-right">{p.numberOfWins ?? "-"}</td>
                <td className="px-3 py-2 text-right">{p.competitiveTier ?? "-"}</td>
              </tr>
            ))}
            {!loading && players.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-neutral-400">
                  Nenhum jogador encontrado para este Act/região.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center">
        <button
          className="px-4 py-2 rounded-xl border border-neutral-700 bg-neutral-800 disabled:opacity-40"
          disabled={!canLoadMore || loading || !actId}
          onClick={() => setPage((p) => p + 1)}
        >
          {loading ? "Carregando..." : canLoadMore ? "Carregar mais" : "Tudo carregado"}
        </button>
      </div>
    </div>
  );
}
