export async function onRequest(context) {

  const request = context.request;
  const ctx = context;

  const url = new URL(request.url);
  const cacheKey = new Request(url.toString(), request);
  const cache = caches.default;

  // ---- CACHE HIT ----
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  const result = {
    updatedAt: Date.now(),
    stations: []
  };

  // -------------------------
  // GNR (JSON API)
  // -------------------------
  const gnrStations = {
    "gnr": {
      name: "Groot Nieuws Radio",
      sourceKey: ["gnr", "groot-nieuws-radio"]
    },
    "gnr-ns": {
      name: "GNR Non-Stop",
      sourceKey: ["non-stop"]
    },
    "gnr-bk": {
      name: "GNR Blijde Klanken",
      sourceKey: ["blijde-klanken"]
    }
  };
  let gnrRaw = null;
  try {
    const gnrRes = await fetch("https://api.grootnieuwsradio.nl/static/now-playing.json");
    gnrRaw = await gnrRes.text();
    const gnrData = JSON.parse(gnrRaw);
    const gnrStationsError = gnrData?.stations;
    if (!gnrStationsError || typeof gnrStationsError !== "object" || Array.isArray(gnrStationsError)) {
      throw new Error("Invalid GNR response shape");
    }
    for (const [id, config] of Object.entries(gnrStations)) {
      let station;
      for (const key of config.sourceKey) {
        station = gnrData.stations[key];
        if (station) break;
      }
      result.stations.push({
        id,
        name: config.name,
        artist: station?.artist ?? null,
        title: station?.title ?? null
      });
    }
  } catch (err) {
    result.gnrDebug = {
      error: String(err),
      rawResponse: gnrRaw
    };
    for (const [id, config] of Object.entries(gnrStations)) {
      result.stations.push({
        id,
        name: config.name,
        error: true
      });
    }
  }

  // -------------------------
  // Christelijke Omroep (plain text)
  // -------------------------
  const coStation = {
    id: "co",
    name: "Christelijke Omroep"
  };
  let coRaw = null;
  try {
    const coRes = await fetch("https://christelijkeomroep.nl/custom/ajax/getnowplaying.ajax.php");
    coRaw = await coRes.text();
    const coText = (await coRes.text()).trim();
    const coParts = coText.split(" - ");
    result.stations.push({
      ...coStation,
      artist: coParts[0] || "",
      title: coParts.slice(1).join(" - ")
    });
  } catch (err) {
    result.coDebug = {
      error: String(err),
      rawResponse: coRaw
    };
    result.stations.push({
      ...coStation,
      error: true
    });
  }

  // -------------------------
  // Reformatorische Omroep (JSON API)
  // -------------------------
  const roStations = {
    2: "RO Psalmen",
    3: "RO Klassiek",
    5: "RO Orgel",
    6: "RO Psalms and Hymns"
  };
  let roRaw = null;
  try {
    const roRes = await fetch("https://beheer.reformatorischeomroep.nl/graphql", {
      method: "POST",
      body: JSON.stringify({
        query: `
          {
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
          }
        `
      })
    });
    roRaw = await roRes.text();
    const roData = JSON.parse(roRaw);
    const roStationsError = roData?.data?.playlists;
    if (!Array.isArray(roStationsError)) {
      throw new Error("Invalid RO response shape");
    }
    const now = Date.now();
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
      const localTimestamp = Date.UTC(y, m - 1, d, hh, mm, ss);
      const { start, end } = getDSTBounds(y);
      const offsetHours = (localTimestamp >= start && localTimestamp < end) ? 2 : 1;
      return localTimestamp - offsetHours * 60 * 60 * 1000;
    };
    for (const station of playlists) {
      const name = stationNames[station.id];
      if (!name) continue;
      const tracks = station.playlist ?? [];
      const current = tracks.find(track => {
        const start = parseTime(track.start);
        const end = parseTime(track.end);
        return start <= now && now < end;
      });
      result.stations.push({
        id: `ro-${station.id}`,
        name,
        artist: current?.author ?? null,
        title: current?.title ?? null
      });
    }
  } catch (err) {
    result.roDebug = {
      error: String(err),
      rawResponse: roRaw
    };
    for (const [id, name] of Object.entries(roStations)) {
      result.stations.push({
        id: `ro-${id}`,
        name,
        error: true
      });
    }
  }

  const response = new Response(JSON.stringify(result), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=30"
    }
  });

  ctx.waitUntil(
    caches.default.put(cacheKey, response.clone())
  );

  return response;
};
