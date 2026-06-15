export async function onRequest(context) {

  const request = context.request;
  const env = context.env;
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
  try {
    const gnrRes = await fetch("https://api.grootnieuwsradio.nl/static/now-playing.json");
    const gnrData = await gnrRes.json();

    const gnr = gnrData.stations["gnr"] ?? gnrData.stations["groot-nieuws-radio"];
    result.stations.push({
      id: "gnr",
      name: "Groot Nieuws Radio",
      artist: gnr.artist,
      title: gnr.title
    });

    const nonstop = gnrData.stations["non-stop"];
    result.stations.push({
      id: "gnr-ns",
      name: "GNR Non-Stop",
      artist: nonstop.artist,
      title: nonstop.title
    });

    const bk = gnrData.stations["blijde-klanken"];
    result.stations.push({
      id: "gnr-bk",
      name: "GNR Blijde Klanken",
      artist: bk.artist,
      title: bk.title
    });

  } catch {
    result.stations.push({
      id: "gnr",
      name: "GNR",
      error: true
    });
  }

  // -------------------------
  // Christelijke Omroep (plain text)
  // -------------------------
  try {
    const coRes = await fetch("https://christelijkeomroep.nl/custom/ajax/getnowplaying.ajax.php");
    const coText = (await coRes.text()).trim();
    const coParts = coText.split(" - ");

    result.stations.push({
      id: "co",
      name: "Christelijke Omroep",
      artist: coParts[0] || "",
      title: coParts.slice(1).join(" - ")
    });

  } catch {
    result.stations.push({
      id: "co",
      name: "Christelijke Omroep",
      error: true
    });
  }

  // -------------------------
  // Reformatorische Omroep
  // -------------------------
  let roRaw = null;
  try {
    const roRes = await fetch(
      "https://beheer.reformatorischeomroep.nl/graphql",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
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
      }
    );
    roRaw = await roRes.text();
    const roData = JSON.parse(roRaw);
    if (roData?.errors?.length) {
      throw new Error(roData.errors[0].message);
    }
    const playlists = roData?.data?.playlists;
    if (!Array.isArray(playlists)) {
      throw new Error("Invalid RO response shape");
    }
    const now = Date.now();
    const stationNames = {
      2: "RO Psalmen",
      3: "RO Klassiek",
      5: "RO Orgel",
      6: "RO Psalms and Hymns"
    };
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
      /* return new Date(t.replace(" ", "T") + "+02:00").getTime(); */
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
    const stationNames = {
      2: "RO Psalmen",
      3: "RO Klassiek",
      5: "RO Orgel",
      6: "RO Psalms and Hymns"
    };
    for (const [id, name] of Object.entries(stationNames)) {
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
