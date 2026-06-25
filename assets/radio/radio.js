const player = document.getElementById("radioPlayer");
const cards = document.querySelectorAll(".station-card");
const buttons = document.querySelectorAll(".play-btn");

let currentCard = null;
let restartLock = false;
let changingStation = false;

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
  await player.play();
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
        player.pause();
        console.log("Button eventListener: pause current station");
      } else {
        await PlayStream();
        console.log("Button eventListener: play current station");
      }
      return;
    }
    // New station
    changingStation = true;
    player.pause();
    resetStations();
    currentCard = card;
    card.classList.add("active");
    await PlayStream();
    console.log("Button eventListener: selected new station");
    changingStation = false;
  });
});

// --- If anything starts playback after a pause,
// force a reconnect to the live stream ---
player.addEventListener("play", async () => {
  if (!changingStation && !restartLock) {
    await PlayStream();
    console.log("Play eventListener: play station");
    return;
  }
  updateCurrentButton();
});
player.addEventListener("pause", () => {
  console.log("Play eventListener: pause station");
  updateCurrentButton();
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
      if (valid && window.currentCard && window.currentCard === card && "mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: s.title || "",
          artist: s.artist || "",
          album: card.querySelector("h3")?.textContent || "Radio"
        });
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
