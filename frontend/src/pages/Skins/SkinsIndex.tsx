import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";

type Weapon = { uuid: string; displayName: string; displayIcon?: string | null; category?: string | null };

export default function SkinsIndex() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState("pt-BR");
  const [filter, setFilter] = useState("");
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); setError(null);
    api.weapons(language)
      .then((d) => setWeapons(d.weapons || []))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [language]);

  const visible = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const list = weapons.slice();
    list.sort((a, b) => a.displayName.localeCompare(b.displayName, "pt-BR"));
    if (!f) return list;
    return list.filter(w =>
      w.displayName.toLowerCase().includes(f) ||
      (w.category || "").toLowerCase().includes(f)
    );
  }, [weapons, filter]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-xl font-semibold">Skins por Arma</h2>

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
          placeholder="Filtrar armas…"
          value={filter}
          onChange={(e)=>setFilter(e.target.value)}
        />
      </div>

      {error && <div className="rounded-xl border border-red-600 bg-red-900/30 p-3 text-red-200">{error}</div>}
      {loading ? (
        <div>Carregando armas…</div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {visible.map(w => (
            <button
              key={w.uuid}
              onClick={() => navigate(`/skins/weapon/${w.uuid}`)}
              className="group text-left rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 hover:bg-neutral-900 transition"
              title={`Ver skins de ${w.displayName}`}
            >
              <div className="aspect-video bg-neutral-900 flex items-center justify-center mb-3">
                {w.displayIcon ? (
                  <img src={w.displayIcon} alt={w.displayName} className="max-h-24 object-contain" loading="lazy" />
                ) : (
                  <span className="text-neutral-500 text-sm">Sem ícone</span>
                )}
              </div>
              <div className="font-semibold">{w.displayName}</div>
              <div className="text-xs text-neutral-400">{w.category || "Arma"}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
