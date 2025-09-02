from flask import Flask, jsonify, request
from flask_cors import CORS
import logging, os
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

if __name__ == "__main__":
    app.run(debug=True, port=PORT)