const player = document.getElementById("radioPlayer");
const cards = document.querySelectorAll(".station-card");
const buttons = document.querySelectorAll(".play-btn");
let currentCard = null;
let restartLock = false;
let changingStation = false;
let debugRadio = false

// --- UI helpers ---
function resetStations() {
  cards.forEach(card => card.classList.remove("active"));
  buttons.forEach(button => {
    button.textContent = "▶ Play";
  });
  if (debugRadio) { console.log("RADIO DEBUG: resetStations()"); }
}
function updateCurrentButton() {
  if (!currentCard) return;
  const button = currentCard.querySelector(".play-btn");
  button.textContent = player.paused ? "▶ Play" : "⏹ Stop";
  if (debugRadio) { console.log("RADIO DEBUG: updateCurrentButton()"); }
}

// --- Always restart stream from live position ---
async function PlayStream() {
  if (!currentCard || restartLock) return;
  restartLock = true;
  if (debugRadio) { console.log("RADIO DEBUG: restartLock = true"); }
  const stream = currentCard.dataset.stream;
  player.pause();
  if (debugRadio) { console.log("RADIO DEBUG: player.pause();"); }
  player.removeAttribute("src");
  if (debugRadio) { console.log("RADIO DEBUG: player.removeAttribute();"); }
  player.src = `${stream}?t=${Date.now()}`;
  player.load();
  if (debugRadio) { console.log("RADIO DEBUG: player.load();"); }
  try {
    await player.play();
    console.log("RADIO: Playing stream");
  } finally {
    restartLock = false;
    if (debugRadio) { console.log("RADIO DEBUG: restartLock = false"); }
  }
}

// --- Button clicks ---
buttons.forEach(button => {
  button.addEventListener("click", async () => {
    const card = button.closest(".station-card");
    const stream = card.dataset.stream;
    // Same station
    if (currentCard === card) {
      if (!player.paused) {
        console.log("RADIO Button eventListener: pause current station");
        player.pause();
      } else {
        console.log("RADIO Button eventListener: play current station");
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
    console.log("RADIO Button eventListener: selected new station");
    await PlayStream();
    changingStation = false;
  });
});

// --- If anything starts playback after a pause,
// force a reconnect to the live stream ---
player.addEventListener("play", async () => {
  if (debugRadio) { console.log("RADIO DEBUG: Play eventListener before `if (!changingStation && !restartLock)`"); }
  if (!changingStation && !restartLock) {
    console.log("RADIO Play eventListener: play station");
    await PlayStream();
    return;
  }
  navigator.mediaSession.playbackState = "playing";
  updateCurrentButton();
});
player.addEventListener("pause", () => {
  console.log("RADIO Play eventListener: pause station");
  navigator.mediaSession.playbackState = "paused";
  updateCurrentButton();
});
if (debugRadio) {
  ["stalled", "waiting", "error"].forEach(type => {
    player.addEventListener(type, (e) => {
      console.log("RADIO DEBUG: ", e.type, e);
    });
  });
}



// --- Set MediaSessiondata ---
function updateMediaSession(card, s = {}) {
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
  if (debugRadio) { console.log("RADIO DEBUG: ", navigator.mediaSession.metadata); }
}
navigator.mediaSession.setActionHandler('play', () => {
  player.play();
});
navigator.mediaSession.setActionHandler('pause', () => {
  player.pause();
});



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
      el.title = text || "Niet beschikbaar";
      if (valid && currentCard === card) {
        updateMediaSession(card, s);
      }
    })
    console.log("RADIO Metadata updated");
  } catch (err) {
    if (err.name === "AbortError") {
      console.warn("RADIO Metadata fetch aborted due to timeout");
    } else {
      console.error("RADIO Now Playing error:", err);
    }
  }
}
function startMetadataUpdates() {
  if (metadataIntervalId) return;
  console.log("RADIO Started metadata updates");
  updateNowPlaying();
  metadataIntervalId = setInterval(updateNowPlaying, METADATA_INTERVAL);
}
function stopMetadataUpdates() {
  if (metadataIntervalId) {
    clearInterval(metadataIntervalId);
    metadataIntervalId = null;
    console.log("RADIO Stopped metadata updates");
  }
}
function onVisibilityChange() {
  if (!document.hidden) {
    const now = Date.now();
    if (now - lastImmediateFetch > VISIBILITY_COOLDOWN) {
      lastImmediateFetch = now;
      console.log("RADIO Visibility change");
      updateNowPlaying();
      if (metadataIntervalId) {
        clearInterval(metadataIntervalId);
        metadataIntervalId = setInterval(updateNowPlaying, METADATA_INTERVAL);
      }
    }
  }
}
document.addEventListener("DOMContentLoaded", updateNowPlaying);
document.addEventListener("click", (event) => {
  const activeStation = event.target.closest(".station-card.active");
  if (activeStation && !event.target.closest("button")) {
    console.log("RADIO Manual update metadata");
    updateNowPlaying();
  }
});
player.addEventListener("play", startMetadataUpdates);
player.addEventListener("pause", stopMetadataUpdates);
document.addEventListener("visibilitychange", onVisibilityChange);
window.addEventListener("focus", onVisibilityChange);
