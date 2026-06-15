// =========================
// SHARED CONSTANTS
// =========================
const gnrStations = {
  "gnr": "Groot Nieuws Radio",
  "non-stop": "GNR Non-Stop",
  "blijde-klanken": "GNR Blijde Klanken"
};
const coStations = {
  "co": "Christelijke Omroep"
};
const roStations = Object.freeze({
  2: "RO Psalmen",
  3: "RO Klassiek",
  5: "RO Orgel",
  6: "RO Psalms and Hymns"
});
const roFallback = Object.values(roStations);

// =========================
// PROVIDER HELPERS
// =========================
async function runProvider(fetchFn, parseFn, fallback) {
  try {
    const raw = await fetchFn();
    return parseFn(raw);
  } catch (err) {
    return fallback.map(name => ({
      name,
      error: true
    }));
  }
}

// =========================
// GNR PROVIDER
// =========================
async function fetchGNR() {
  const res = await fetch("https://api.grootnieuwsradio.nl/static/now-playing.json");
  return await res.text();
}
function parseGNR(raw) {
  const data = JSON.parse(raw)?.stations;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Invalid GNR response shape");
  }
  const out = [];
  for (const [id, station] of Object.entries(data)) {
    out.push({
      name,
      artist: station?.artist ?? null,
      title: station?.title ?? null
    });
  }
  return out;
}

// =========================
// CO PROVIDER
// =========================
async function fetchCO() {
  const res = await fetch("https://christelijkeomroep.nl/custom/ajax/getnowplaying.ajax.php");
  return await res.text();
}
function parseCO(raw) {
  const parts = raw.trim().split(" - ");
  const out = [];
  for (const [id, name] of Object.entries(coStations)) {
    out.push({
      name,
      artist: station?.artist ?? null,
      title: station?.title ?? null
    });
  }
  return out;
}

// =========================
// RO PROVIDER
// =========================
function lastSunday(year, month) {
  const d = new Date(Date.UTC(year, month + 1, 0));
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - day);
  return d;
}
function getDSTBounds(year) {
  const start = lastSunday(year, 2);
  start.setUTCHours(1);
  const end = lastSunday(year, 9);
  end.setUTCHours(1);
  return {
    start: start.getTime(),
    end: end.getTime()
  };
}
const parseTime = (t) => {
  if (!t) return NaN;
  const [date, time] = t.split(" ");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm, ss] = time.split(":").map(Number);
  const utcTimestamp = Date.UTC(y, m - 1, d, hh, mm, ss);
  const { start, end } = getDSTBounds(y);
  const offsetHours = (utcTimestamp >= start && utcTimestamp < end) ? 2 : 1;
  return utcTimestamp - offsetHours * 60 * 60 * 1000;
};
async function fetchRO() {
  const res = await fetch("https://beheer.reformatorischeomroep.nl/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `{
        playlists {
          id
          playlist {
            title
            author
            date
            start
            end
          }
        }
      }`
    })
  });
  const raw = await res.text();
  return JSON.parse(raw);
}
function parseRO(roData, nowWithOffset) {
  const roJSONresponse = roData?.data?.playlists;
  if (!Array.isArray(roJSONresponse)) {
    throw new Error("Invalid RO response shape");
  }
  const stations = [];
  for (const station of roJSONresponse) {
    const name = roStations[station.id];
    if (!name) continue;
    const tracks = station.playlist ?? [];
    const current = tracks.find(track => {
      const start = parseTime(track.start);
      const end = parseTime(track.end);
      return start <= nowWithOffset && nowWithOffset < end;
    });
    stations.push({
      name,
      artist: current?.author ?? null,
      title: current?.title ?? null
    });
  }
  return stations;
}

// =========================
// WORKER HANDLER
// =========================
export async function onRequest(context) {
  const request = context.request;
  const ctx = context;
  const cache = caches.default;
  const url = new URL(request.url);
  const cacheKey = new Request(url.toString(), request);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  const result = {
    updatedAt: Date.now(),
    stations: []
  };
  const nowWithOffset = Date.now() + 30000;

  const [gnr, co, ro] = await Promise.all([
    runProvider(fetchGNR, parseGNR, Object.values(gnrStations)),
    runProvider(fetchCO, parseCO, Object.values(coStations)),
    runProvider(fetchRO, (data) => parseRO(data, nowWithOffset), roFallback)
  ]);
  result.stations.push(...gnr, ...co, ...ro);

  const response = new Response(JSON.stringify(result), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=30"
    }
  });

  ctx.waitUntil(cache.put(cacheKey, response.clone()));

  return response;
}
