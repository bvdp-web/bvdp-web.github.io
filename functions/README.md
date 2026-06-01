`/functions/api/file.js` only works when connected to CloudFlare or another backend.

CloudFlare changes everthing in `/functions/pathname.js` automatically in `pathname` as an api-request.

I need this because some radios (Christelijke Omroep) give a CORS error.


## Back-up code in case of: 

```
  try {
    const res = await fetch("/api/radio");
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    lastMetadataFetch = Date.now();
    const stations = data.stations;
    for (const s of stations) {
      const el = document.getElementById(`${s.id}-now-playing`);
      if (!el) continue;
      if (s.error) {
        el.textContent = "Niet beschikbaar";
        continue;
      }
      el.textContent = `${s.title} — ${s.artist}`;
    }
  } catch (err) {
    console.error("Now Playing error:", err);
  }
```
should be replace with 
```
  try {
    // Groot Nieuws Radio
    const gnrRes = await fetch("https://api.grootnieuwsradio.nl/static/now-playing.json")
    const gnrData = await gnrRes.json();
    const gnr = gnrData.stations["gnr"] ?? gnrData.stations["groot-nieuws-radio"];
    const nonstop = data.stations["non-stop"];
    const bk = data.stations["blijde-klanken"];
    document.getElementById("gnr-now-playing").textContent = `${gnr.title} — ${gnr.artist}`;
    document.getElementById("gnr-ns-now-playing").textContent = `${nonstop.title} — ${nonstop.artist}`;
    document.getElementById("gnr-bk-now-playing").textContent = `${bk.title} — ${bk.artist}`;
  } catch (err) {
    console.error("GNR metadata error:", err);
    document.getElementById("gnr-now-playing").textContent = "Niet beschikbaar";
    document.getElementById("gnr-ns-now-playing").textContent = "Niet beschikbaar";
    document.getElementById("gnr-bk-now-playing").textContent = "Niet beschikbaar";
   }
  try {
    // Christelijke Omroep
    const coRes = await fetch("https://christelijkeomroep.nl/custom/ajax/getnowplaying.ajax.php");
    const coText = (await coRes.text()).trim();
    const coParts = coText.split(" - ");
    if (coParts.length >= 2) {
      const artist = coParts[0];
      const title = coParts.slice(1).join(" - ");
      document.getElementById("co-now-playing").textContent = `${title} — ${artist}`;
    } else {
      document.getElementById("co-now-playing").textContent = coText;
    }
  } catch (err) {
    console.error("CO metadata error:", err);
    document.getElementById("co-now-playing").textContent = "Niet beschikbaar";
  }
```
