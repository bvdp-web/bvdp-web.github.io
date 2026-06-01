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
    const text = (await coRes.text()).trim();
    const parts = text.split(" - ");

    result.stations.push({
      id: "co",
      name: "Christelijke Omroep",
      artist: parts[0] || "",
      title: parts.slice(1).join(" - ")
    });

  } catch {
    result.stations.push({
      id: "co",
      name: "Christelijke Omroep",
      error: true
    });
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
