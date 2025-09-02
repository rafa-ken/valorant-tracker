import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";

type Skin = {
  uuid: string;
  displayName: string;
  displayIcon?: string;
  fullRender?: string;
  levels?: any[];
  chromas?: any[];
};

export default function SkinsByWeapon() {
  const navigate = useNavigate();
  const { uuid = "" } = useParams(); // weapon uuid
  const [language, setLanguage] = useState("pt-BR");
  const [skins, setSkins] = useState<Skin[]>([]);
  const [weaponName, setWeaponName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);

    // carrega nome da arma (para o título) e as skins
    Promise.all([api.weapons(language), api.weaponSkins(uuid, language)])
      .then(([wresp, sresp]) => {
        if (!alive) return;
        const w = (wresp.weapons || []).find((x: any) => x.uuid === uuid);
        setWeaponName(w?.displayName || "Arma");
        setSkins(sresp.skins || []);
      })
      .catch((e) => alive && setError(String(e)))
      .finally(() => alive && setLoading(false));

    return () => { alive = false; };
  }, [uuid, language]);

  const list = useMemo(() => skins, [skins]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/skins")}
            className="px-3 py-2 rounded-xl border border-neutral-700 bg-neutral-800 text-sm"
          >
            ← Armas
          </button>
          <h2 className="text-xl font-semibold">Skins — {weaponName}</h2>
        </div>

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
      </div>

      {error && <div className="rounded-xl border border-red-600 bg-red-900/30 p-3 text-red-200">{error}</div>}

      {loading ? (
        <div>Carregando skins…</div>
      ) : list.length === 0 ? (
        <div className="text-neutral-400">Nenhuma skin encontrada.</div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {list.map((s) => (
            <article
              key={s.uuid}
              className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden"
            >
              <div className="aspect-video bg-neutral-900 flex items-center justify-center">
                {s.fullRender ? (
                  <img src={s.fullRender} alt={s.displayName} className="max-h-40 object-contain" loading="lazy" />
                ) : s.displayIcon ? (
                  <img src={s.displayIcon} alt={s.displayName} className="max-h-40 object-contain" loading="lazy" />
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
        </div>
      )}
    </div>
  );
}
