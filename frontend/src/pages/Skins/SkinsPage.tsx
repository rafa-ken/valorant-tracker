import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import type { SkinsResponse } from "../../lib/types";

type Skin = SkinsResponse["skins"][number];

export default function SkinsPage() {
  const [language, setLanguage] = useState("pt-BR");
  const [q, setQ] = useState("");
  const [skins, setSkins] = useState<Skin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.skins({ language, q: q.trim() || undefined })
      .then((d) => setSkins(d.skins || []))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [language, q]);

  const list = useMemo(() => skins, [skins]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Skins de Armas</h2>

      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-sm">
          Idioma:&nbsp;
          <select
            className="bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option>pt-BR</option>
            <option>en-US</option>
            <option>es-ES</option>
          </select>
        </label>

        <input
          className="bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 w-72"
          placeholder="Buscar skin…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-600 bg-red-900/30 p-3 text-red-200">{error}</div>
      )}

      {loading ? (
        <div>Carregando skins…</div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {list.map((s) => (
            <article
              key={s.uuid}
              className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden"
            >
              <div className="aspect-video bg-neutral-900 flex items-center justify-center">
                {s.fullRender ? (
                  <img src={s.fullRender} alt={s.displayName} className="max-h-40 object-contain" />
                ) : s.displayIcon ? (
                  <img src={s.displayIcon} alt={s.displayName} className="max-h-40 object-contain" />
                ) : (
                  <span className="text-neutral-500 text-sm">Sem imagem</span>
                )}
              </div>
              <div className="p-3">
                <h3 className="font-medium">{s.displayName}</h3>
                <div className="text-xs text-neutral-400">
                  Níveis: {s.levels?.length ?? 0} — Chromas: {s.chromas?.length ?? 0}
                </div>
              </div>
            </article>
          ))}
          {list.length === 0 && (
            <div className="text-neutral-400">Nenhuma skin encontrada.</div>
          )}
        </div>
      )}
    </div>
  );
}
