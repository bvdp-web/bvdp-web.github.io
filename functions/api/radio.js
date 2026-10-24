// =========================
// SHARED CONSTANTS
// =========================
const roStations = Object.freeze({
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
  const [date, time] = t.split(" ");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm, ss] = time.split(":").map(Number);
  const localAsUtc = Date.UTC(y, m - 1, d, hh, mm, ss);  // Need m-1, because RO JSON input gives 1-12 but JS months are 0-11.
  const { start, end } = getWinterSummerTime(y);
  const offset = localAsUtc >= start && localAsUtc < end ? 2 : 1;
  return localAsUtc - offset * 3600 * 1000;
}
async function fetchRO() {
  const res = await fetch("https://beheer.reformatorischeomroep.nl/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `{ playlists { id playlist { title author date start end } } }`
    })
  });
  return res.json();
}
function parseRO(data, now) {
  const playlists = data?.data?.playlists;
  if (!Array.isArray(playlists)) {
    throw new Error("Invalid RO response shape");
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
  return res.json();
}
function parseGNR(data) {
  const stations = data?.stations;
  if (!stations || typeof stations !== "object") {
    throw new Error("Invalid GNR response shape");
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
  return res.text();
}
function parseCO(raw) {
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
  return res.json();
}
function parseCNL(data) {
  if (!data?.current) {
    throw new Error("Invalid CNL response shape");
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
async function run(fetchFn, parseFn, fallback, ...args) {
  try {
    const raw = await fetchFn();
    return parseFn(raw, ...args);
  } catch (err) {
    return fallback.map(name =>
      typeof name === "string"
        ? errorResponse(name, err)
        : { ...name, error: true, raw: String(err) }
    );
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
    run(fetchRO, parseRO, Object.entries(roStations), now),
    run(fetchGNR, parseGNR, Object.values(gnrStations)),
    run(fetchCO, parseCO, Object.values(coStations)),
    run(fetchCNL, parseCNL, Object.values(cnlStations))
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
