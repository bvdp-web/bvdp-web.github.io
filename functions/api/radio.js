// =========================
// SHARED CONSTANTS
// =========================
const roStations = Object.freeze({
  1: "RO Radio 1",
  2: "RO Psalmen",
  3: "RO Klassiek",
  5: "RO Orgel",
  6: "RO Psalms and Hymns"
});
const gnrStations = {
  "gnr": "Groot Nieuws Radio",
  "non-stop": "GNR Non-Stop",
  "blijde-klanken": "GNR Blijde Klanken"
};
const coStations = {
  "co": "Christelijke Omroep"
};
const cnlStations = {
  "cnl": "ClassicNL"
};

// =========================
// HELPERS
// =========================
function errorResponse(name, err) {
  return {
    name,
    error: true,
    raw: err?.message ?? String(err)
  };
}

// =========================
// RO
// =========================
function getWinterSummerTime(year) {
  function lastSunday(month) {
    const d = new Date(Date.UTC(year, month, 0, 1));  // Creates a date at 01:00 UTC on the last day of the month. In JS, day 0 means the last day of the previous month.
    d.setUTCDate(d.getUTCDate() - d.getUTCDay());     // Moves backward to the most recent Sunday. getUTCDay() returns 0 for Sunday, 1 for Monday, etc.
    return d.getTime();
  }
  return {
    start: lastSunday(3),  // Last Sunday of March, 01:00 UTC
    end: lastSunday(10)    // Last Sunday of October, 01:00 UTC
  };
}
function parseTime(t) {
  if (!t) return NaN;
  const [date, time] = t.split(" ");                     // date "2026-10-24" start "2026-10-24 15:03:09" end "2026-10-24 15:06:39"
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm, ss] = time.split(":").map(Number);
  const localAsUtc = Date.UTC(y, m - 1, d, hh, mm, ss);  // Need m-1, because RO JSON input gives 1-12 but JS months are 0-11.
  const { start, end } = getWinterSummerTime(y);
  const offset = localAsUtc >= start && localAsUtc < end ? 2 : 1;
  return localAsUtc - offset * 3600 * 1000;
}
function hasROCoverage(data, now) {
  const playlists = data?.data?.playlists;
  if (!Array.isArray(playlists)) return false;
  // Every configured RO station must have a track
  // covering the requested timestamp.
  for (const id of Object.keys(roStations)) {
    const station = playlists.find(s => String(s.id) === id);
    if (!station || !Array.isArray(station.playlist)) {
      return false;
    }
    const hasCurrentTrack = station.playlist.some(t => {
      const start = parseTime(t.start);
      const end = parseTime(t.end);
      return start <= now && now < end;
    });
    if (!hasCurrentTrack) return false;
  }
  return true;
}
async function fetchRO(env, now) {
  if (!env?.RO_CACHE) {
    throw new Error("RO_CACHE Worker KV binding is missing. Check Cloudflare Pages bindings.");
  }
  const CACHE_KEY = "ro-playlists";
  const BACKUP_DURATION = 12 * 60 * 60; // 12 hours
  // Read cached GraphQL response
  let cachedRaw = null;
  try {
    cachedRaw = await env.RO_CACHE.get(CACHE_KEY);
  } catch (error) {
    console.warn("RO Worker KV cache read failed:", error);
  }
  let cached = null;
  if (cachedRaw) {
    try {
      cached = JSON.parse(cachedRaw);
    } catch {
      console.warn("RO Worker KV cache contains invalid JSON.");
    }
  }
  // Check whether cached data covers the requested timestamp
  if (cached?.data && hasROCoverage(cached.data, now)) {
    return {
      data: cached.data,
      worker_kv: true,
      worker_kvFetchedAt: new Date(cached.fetchedAt).toLocaleString("nl-NL", {timeZone: "Europe/Amsterdam"})
    };
  }
  // If cache is missing or does not cover the requested timestamp, fetch fresh data from RO.
  try {
    const url = new URL("https://beheer.reformatorischeomroep.nl/graphql");
    const query = `{ playlists { id playlist { title author date start end } } }`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Referer": "https://www.reformatorischeomroep.nl/",
        "Origin": "https://www.reformatorischeomroep.nl",
        "User-Agent": "Mozilla/5.0"
      },
      body: JSON.stringify({ query })
    });
    const body = await res.text();
    if (!res.ok) {
      throw new Error(`RO HTTP ${res.status}: ${body.slice(0, 500)}`);
    }
    const data = JSON.parse(body);
    // Validate response structure
    if (!Array.isArray(data?.data?.playlists)) {
      throw new Error("Invalid RO response shape: " + JSON.stringify(data).slice(0, 500));
    }
    // Store the complete valid GraphQL response
    await env.RO_CACHE.put(
      CACHE_KEY,
      JSON.stringify({
        fetchedAt: Date.now(),
        data
      }),
      {
        expirationTtl: BACKUP_DURATION
      }
    );
    return {
      data,
      worker_kv: false,
      worker_kvFetchedAt: new Date(fetchedAt).toLocaleString("nl-NL", {timeZone: "Europe/Amsterdam"})
    };
  } catch (error) {
    console.error("RO fetch failed:", error);
    throw error;
  }
}
function parseRO(data, now) {
  const playlists = data?.data?.playlists;
  if (!Array.isArray(playlists)) {
    throw new Error("Invalid RO response shape: " + JSON.stringify(data).slice(0, 500));
  }
  const out = [];
  for (const station of playlists) {
    const name = roStations[station.id];
    if (!name) continue;
    const tracks = station.playlist ?? [];
    const current = tracks.find(t => {
      const start = parseTime(t.start);
      const end = parseTime(t.end);
      return start <= now && now < end;
    });
    out.push({
      name,
      artist: current?.author ?? null,
      title: current?.title ?? null
    });
  }
  return out;
}

// =========================
// GNR
// =========================
async function fetchGNR() {
  const res = await fetch("https://api.grootnieuwsradio.nl/static/now-playing.json");
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`GNR HTTP ${res.status}: ${body.slice(0, 500)}`);
  }
  return JSON.parse(body);
}
function parseGNR(data) {
  const stations = data?.stations;
  if (!stations || typeof stations !== "object") {
    throw new Error("Invalid GNR response shape: " + JSON.stringify(data).slice(0, 500));
  }
  const out = [];
  for (const [id, station] of Object.entries(stations)) {
    const name = gnrStations[id];
    if (!name) continue;
    out.push({
      name,
      artist: station?.artist ?? null,
      title: station?.title ?? null
    });
  }
  return out;
}

// =========================
// CO
// =========================
async function fetchCO() {
  const res = await fetch("https://christelijkeomroep.nl/custom/ajax/getnowplaying.ajax.php");
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`CO HTTP ${res.status}: ${body.slice(0, 500)}`);
  }
  return body;
}
function parseCO(raw) {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("Invalid CO response: " + String(raw).slice(0, 500));
  }
  const parts = raw.trim().split(" - ");
  return [{
    name: coStations["co"],
    artist: parts[0] ?? null,
    title: parts.slice(1).join(" - ") ?? null
  }];
}

// =========================
// CNL
// =========================
async function fetchCNL() {
  const res = await fetch("https://www.classic.nl/nowplaying/fetch.php?station=CLASSICFM");
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`CNL HTTP ${res.status}: ${body.slice(0, 500)}`);
  }
  return JSON.parse(body);
}
function parseCNL(data) {
  if (!data?.current || typeof data.current !== "object") {
    throw new Error("Invalid CNL response shape: " + JSON.stringify(data).slice(0, 500));
  }
  return [{
    name: cnlStations["cnl"],
    artist: data.current.title ?? null, // ClassicNL turned it around: artist=title and title=artist
    title: data.current.artist ?? null
  }];
}

// =========================
// RUN WRAPPER
// =========================
async function run(fetchFn, parseFn, fallback, env, ...args) {
  let worker_kv
  let worker_kvFetchedAt;
  try {
    const result = await fetchFn(env, ...args);
    // RO returns { data, worker_kv }; other stations return raw data.
    const raw = result?.data !== undefined ? result.data : result;
    if (typeof result?.worker_kv === "boolean") {
      worker_kv = result.worker_kv;
      worker_kvFetchedAt = result.worker_kvFetchedAt;
    }
    return parseFn(raw, ...args).map(station => ({
      ...station,
      ...(typeof worker_kv === "boolean" ? { worker_kv, worker_kvFetchedAt } : {})
    }));
  } catch (err) {
    return fallback.map(name => ({
      ...(typeof name === "string"
        ? errorResponse(name, err)
        : { ...name, error: true, raw: String(err) }),
      ...(typeof worker_kv === "boolean" ? { worker_kv, worker_kvFetchedAt } : {})
    }));
  }
}

// =========================
// WORKER
// =========================
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const key = new Request(url.toString(), context.request);
  const cache = caches.default;
  const cached = await cache.match(key);
  if (cached) return cached;
  const now = Date.now() + 45000;

  const [gnr, co, ro, cnl] = await Promise.all([
    run(fetchRO, parseRO, Object.values(roStations), context.env, now),
    run(fetchGNR, parseGNR, Object.values(gnrStations), context.env),
    run(fetchCO, parseCO, Object.values(coStations), context.env),
    run(fetchCNL, parseCNL, Object.values(cnlStations), context.env)
  ]);
  const result = {
    updatedAt: Date.now(),
    stations: [ ...ro, ...gnr, ...co, ...cnl]
  };

  const response = new Response(JSON.stringify(result), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=30",
      "Access-Control-Allow-Origin": "*"
    }
  });
  context.waitUntil(cache.put(key, response.clone()));
  return response;
}
