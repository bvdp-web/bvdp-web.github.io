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
                  start
                  end
                }
              }
            }
          `
        })
      }
    );
    const roData = await roRes.json();
    const playlists = roData?.data?.playlists ?? [];
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
    for (const station of playlists) {
      if (!stationNames[station.id]) {
        continue;
      }
      const current = station.playlist.find(track => {
        const start = new Date(track.start.replace(" ", "T")).getTime();
        const end = new Date(track.end.replace(" ", "T")).getTime();
        return start <= now && now < end;
      });
      result.stations.push({
        id: `ro-${station.id}`,
        name: stationNames[station.id],
        artist: current?.author ?? "",
        title: current?.title ?? ""
      });
    }
  } catch (err) {
    result.roDebug = String(err);
    for (const [id, name] of Object.entries({
      2: "RO Psalmen",
      3: "RO Klassiek",
      5: "RO Orgel",
      6: "RO Psalms and Hymns"
    })) {
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
