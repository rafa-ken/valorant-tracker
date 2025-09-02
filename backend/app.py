from flask import Flask, jsonify, request
from flask_cors import CORS
import logging, os, time
from dotenv import load_dotenv
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import requests_cache

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# --- config ---
RIOT_API_KEY = os.getenv("RIOT_API_KEY")
DEFAULT_REGION = os.getenv("DEFAULT_REGION", "br")
TTL_CONTENT = int(os.getenv("CACHE_TTL_CONTENT", "3600"))
TTL_RANKED  = int(os.getenv("CACHE_TTL_RANKED", "300"))
TTL_STATUS  = int(os.getenv("CACHE_TTL_STATUS", "60"))
PORT        = int(os.getenv("PORT", "5001"))

if not RIOT_API_KEY:
    raise RuntimeError("RIOT_API_KEY não definido no .env")

BASE = "https://{region}.api.riotgames.com"
ALLOWED_REGIONS = {"br","na","latam","eu","ap","kr"}

# --- logging básico ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s"
)
log = logging.getLogger("valorant-backend")

# --- HTTP session com cache + retry/backoff ---
retry = Retry(
    total=5,
    backoff_factor=0.5,                    # 0.5s, 1s, 2s, ...
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=["GET"]
)
adapter = HTTPAdapter(max_retries=retry)

session = requests_cache.CachedSession(
    cache_name="riot_cache",
    backend="sqlite",
    expire_after=0,                         # controlamos por rota
)
session.headers.update({
    "X-Riot-Token": RIOT_API_KEY,
    "User-Agent": "ValorantTracker/1.0 (+backend)"
})
session.mount("https://", adapter)
session.mount("http://", adapter)
TIMEOUT = 10

def _region():
    region = request.args.get("region", DEFAULT_REGION).lower()
    return region if region in ALLOWED_REGIONS else DEFAULT_REGION

def _locale():
    return request.args.get("locale", "pt-BR")

def _error(status, code, detail):
    return jsonify({"error": code, "detail": detail}), status

@app.get("/api/health")
def health():
    return {"ok": True}

# -----------------------------
# VAL-CONTENT-V1 (Riot oficial)
# -----------------------------
@app.get("/api/content")
def content():
    region, locale = _region(), _locale()
    url = f"{BASE.format(region=region)}/val/content/v1/contents"
    session.expire_after = TTL_CONTENT
    try:
        r = session.get(url, params={"locale": locale}, timeout=TIMEOUT)
    except requests.RequestException as e:
        log.exception("content request failed")
        return _error(502, "upstream_error", str(e))
    if r.status_code != 200:
        return _error(r.status_code, "riot_error", r.text)
    return r.json()

# -----------------------------
# VAL-RANKED-V1 (Riot oficial)
# -----------------------------
@app.get("/api/leaderboard")
def leaderboard():
    region = _region()
    act_id = request.args.get("actId")
    if not act_id:
        return _error(400, "missing_param", "actId é obrigatório")

    size = int(request.args.get("size", 200))
    start_index = int(request.args.get("startIndex", 0))

    url = f"{BASE.format(region=region)}/val/ranked/v1/leaderboards/by-act/{act_id}"
    session.expire_after = TTL_RANKED
    try:
        r = session.get(url, params={"size": size, "startIndex": start_index}, timeout=TIMEOUT)
    except requests.RequestException as e:
        log.exception("leaderboard request failed")
        return _error(502, "upstream_error", str(e))
    if r.status_code != 200:
        return _error(r.status_code, "riot_error", r.text)

    data = r.json()
    data["players"] = data.get("players") or data.get("Players") or []
    return data

# ----------------------------
# VAL-STATUS-V1 (Riot oficial)
# ----------------------------
@app.get("/api/status")
def status():
    region = _region()
    url = f"{BASE.format(region=region)}/val/status/v1/platform-data"
    session.expire_after = TTL_STATUS
    try:
        r = session.get(url, timeout=TIMEOUT)
    except requests.RequestException as e:
        log.exception("status request failed")
        return _error(502, "upstream_error", str(e))
    if r.status_code != 200:
        return _error(r.status_code, "riot_error", r.text)
    return r.json()

# ---------------------------------------------------
# SKINS (não-oficial) — proxy do valorant-api.com
# ---------------------------------------------------
# Observação: esta rota NÃO usa a chave da Riot.
# Documentação da comunidade: https://valorant-api.com/
SKINS_BASE = "https://valorant-api.com/v1/weapons/skins"
SKINS_TTL  = 3600  # cache em memória (1h)
_sk_cache = {"ts": 0, "key": "", "data": None}

@app.get("/api/skins")
def skins():
    """
    Retorna lista de skins de armas (via valorant-api.com).
    Parâmetros:
      - language (default: pt-BR) — ex: en-US, es-ES
      - weaponUuid (opcional)     — filtra por arma específica
      - q (opcional)              — filtro textual por nome
    """
    language = request.args.get("language", "pt-BR")
    weapon_uuid = request.args.get("weaponUuid")
    q = (request.args.get("q") or "").strip().lower()

    cache_key = f"{language}:{weapon_uuid or ''}"
    now = time.time()

    # cache simples em memória
    if _sk_cache["data"] and _sk_cache["key"] == cache_key and (now - _sk_cache["ts"]) < SKINS_TTL:
        data = _sk_cache["data"]
    else:
        params = {"language": language}
        if weapon_uuid:
            params["weaponUuid"] = weapon_uuid  # a API aceita filtro por arma
        try:
            resp = requests.get(SKINS_BASE, params=params, timeout=TIMEOUT)
        except requests.RequestException as e:
            log.exception("skins upstream request failed")
            return _error(502, "skins_upstream_error", str(e))

        if resp.status_code != 200:
            return _error(resp.status_code, "skins_upstream_error", resp.text)

        payload = resp.json()
        data = payload.get("data", [])
        _sk_cache.update({"ts": now, "key": cache_key, "data": data})

    # filtro textual no servidor (opcional)
    if q:
        ql = q.lower()
        data = [s for s in data if ql in (s.get("displayName") or "").lower()]

    return {"skins": data}

WEAPONS_BASE = "https://valorant-api.com/v1/weapons"
WEAPONS_TTL  = 3600  # 1h

_weapons_cache = {"ts": 0, "key": "", "data": None}
_weapon_skins_cache = {}  # key: f"{lang}:{uuid}" -> {ts, data}

@app.get("/api/weapons")
def weapons():
    """
    Lista todas as armas (inclui Melee/Faca).
    Params:
      - language (default: pt-BR)
    """
    language = request.args.get("language", "pt-BR")
    key = language
    now = time.time()

    if _weapons_cache["data"] and _weapons_cache["key"] == key and (now - _weapons_cache["ts"]) < WEAPONS_TTL:
        data = _weapons_cache["data"]
    else:
        try:
            resp = requests.get(WEAPONS_BASE, params={"language": language}, timeout=TIMEOUT)
            if resp.status_code != 200:
                return _error(resp.status_code, "weapons_upstream_error", resp.text)
            payload = resp.json()
            data = payload.get("data", [])
            _weapons_cache.update({"ts": now, "key": key, "data": data})
        except requests.RequestException as e:
            log.exception("weapons upstream failed")
            return _error(502, "weapons_upstream_error", str(e))

    # enxugar o payload pra front (uuid + nome + ícone opcional)
    items = [
        {
            "uuid": w.get("uuid"),
            "displayName": w.get("displayName"),
            "displayIcon": w.get("displayIcon"),
            "category": w.get("category"),
        }
        for w in data
    ]
    return {"weapons": items}

@app.get("/api/weapons/<weapon_uuid>/skins")
def weapon_skins(weapon_uuid: str):
    """
    Skins de uma arma específica (por UUID).
    Params:
      - language (default: pt-BR)
    """
    language = request.args.get("language", "pt-BR")
    cache_key = f"{language}:{weapon_uuid}"
    now = time.time()

    cached = _weapon_skins_cache.get(cache_key)
    if cached and (now - cached["ts"]) < WEAPONS_TTL:
        return {"skins": cached["data"]}

    try:
        # a API retorna o objeto da arma inteiro; extraímos 'skins'
        resp = requests.get(f"{WEAPONS_BASE}/{weapon_uuid}", params={"language": language}, timeout=TIMEOUT)
        if resp.status_code != 200:
            return _error(resp.status_code, "weapon_upstream_error", resp.text)
        weapon = resp.json().get("data") or {}
        skins = weapon.get("skins") or []
    except requests.RequestException as e:
        log.exception("weapon upstream failed")
        return _error(502, "weapon_upstream_error", str(e))

    # salva cache simples
    _weapon_skins_cache[cache_key] = {"ts": now, "data": skins}
    return {"skins": skins}


if __name__ == "__main__":
    app.run(debug=True, port=PORT)
