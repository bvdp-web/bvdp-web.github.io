const player = document.getElementById("radioPlayer");
const cards = document.querySelectorAll(".station-card");
const buttons = document.querySelectorAll(".play-btn");

let currentCard = null;
let restartLock = false;
let changingStation = false;
let debug = false

// --- UI helpers ---
function resetStations() {
  cards.forEach(card => card.classList.remove("active"));
  buttons.forEach(button => {
    button.textContent = "▶ Play";
  });
}
function updateCurrentButton() {
  if (!currentCard) return;
  const button = currentCard.querySelector(".play-btn");
  button.textContent = player.paused ? "▶ Play" : "⏹ Stop";
}

// --- Always restart stream from live position ---
async function PlayStream() {
  if (!currentCard || restartLock) return;
  restartLock = true;
  const stream = currentCard.dataset.stream;
  player.pause();
  player.removeAttribute("src");
  player.src = `${stream}?t=${Date.now()}`;
  player.load();
  updateMediaSession(currentCard, { title: "Loading…" });
  await player.play();
  if ("mediaSession" in navigator) {
    navigator.mediaSession.playbackState = "playing";
  }
  console.log("Playing stream");
  restartLock = false;
}

// --- Button clicks ---
buttons.forEach(button => {
  button.addEventListener("click", async () => {
    const card = button.closest(".station-card");
    const stream = card.dataset.stream;
    // Same station
    if (currentCard === card) {
      if (!player.paused) {
        console.log("Button eventListener: pause current station");
        player.pause();
      } else {
        console.log("Button eventListener: play current station");
        await PlayStream();
      }
      return;
    }
    // New station
    changingStation = true;
    player.pause();
    resetStations();
    currentCard = card;
    card.classList.add("active");
    console.log("Button eventListener: selected new station");
    await PlayStream();
    changingStation = false;
  });
});

// --- If anything starts playback after a pause,
// force a reconnect to the live stream ---
player.addEventListener("play", async () => {
  if (!changingStation && !restartLock) {
    console.log("Play eventListener: play station");
    await PlayStream();
    return;
  }
  updateCurrentButton();
});
player.addEventListener("pause", () => {
  console.log("Play eventListener: pause station");
  if ("mediaSession" in navigator) {
    navigator.mediaSession.playbackState = "paused";
  }
  updateCurrentButton();
});
if (debug) {
  ["stalled", "waiting", "error"].forEach(type => {
    player.addEventListener(type, (e) => {
      console.log(e.type, e);
    });
  });
}




// --- Set MediaSessiondata ---
function updateMediaSession(card, s = {}) {
  if (!("mediaSession" in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: s.title || "Loading…",
    artist: s.artist || "",
    album: card.querySelector("h3")?.textContent?.trim() || "Radio",
    artwork: [{
      src: card.querySelector("img")?.src ||
           document.querySelector('link[rel~="icon"]')?.href ||
           "/assets/images/favicon.png"
    }]
  });
  if (debug) {
    console.log(navigator.mediaSession.metadata);
  }
}




// --- Set Metadata ---
let metadataIntervalId = null;
let lastImmediateFetch = 0; 
const METADATA_INTERVAL = 30000;
const VISIBILITY_COOLDOWN = 30000;
async function updateNowPlaying() {
  if (!navigator.onLine) return;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch("/api/radio", { cache: "no-store", signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const map = new Map(data.stations.map(s => [s.name, s]));
    document.querySelectorAll(".station-card").forEach(card => {
      const name = card.dataset.stationId;
      const el = card.querySelector(".now-playing");
      if (!el) return;
      const s = map.get(name);
      const valid = s && !s.error;
      let text = "Niet beschikbaar";
      if (valid) {
        text = [s.title, s.artist].filter(Boolean).join(" — ");
      }
      el.textContent = text || "Niet beschikbaar";
      if (valid && currentCard === card) {
        updateMediaSession(card, s);
      }
    })
    console.log("Metadata updated");
  } catch (err) {
    if (err.name === "AbortError") {
      console.warn("Metadata fetch aborted due to timeout");
    } else {
      console.error("Now Playing error:", err);
    }
  }
}
function startMetadataUpdates() {
  if (metadataIntervalId) return;
  console.log("Started metadata updates");
  updateNowPlaying();
  metadataIntervalId = setInterval(updateNowPlaying, METADATA_INTERVAL);
}
function stopMetadataUpdates() {
  if (metadataIntervalId) {
    clearInterval(metadataIntervalId);
    metadataIntervalId = null;
    console.log("Stopped metadata updates");
  }
}
function onVisibilityChange() {
  if (!document.hidden) {
    const now = Date.now();
    if (now - lastImmediateFetch > VISIBILITY_COOLDOWN) {
      lastImmediateFetch = now;
      console.log("Visibility change");
      updateNowPlaying();
      if (metadataIntervalId) {
        clearInterval(metadataIntervalId);
        metadataIntervalId = setInterval(updateNowPlaying, METADATA_INTERVAL);
      }
    }
  }
}
document.addEventListener("DOMContentLoaded", updateNowPlaying);
player.addEventListener("play", startMetadataUpdates);
player.addEventListener("pause", stopMetadataUpdates);
document.addEventListener("visibilitychange", onVisibilityChange);
window.addEventListener("focus", onVisibilityChange);
