const player = document.getElementById("radioPlayer");
const cards = document.querySelectorAll(".station-card");
const buttons = document.querySelectorAll(".play-btn");

let currentCard = null;
let reconnectTimer = null;
let restartLock = false;
let userStopped = false;
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
  try {
    const stream = currentCard.dataset.stream;
    player.pause();
    player.src = "";
    player.load();
    player.src = stream;
    await player.play();
    console.log("Playing stream");
  } catch (err) {
    console.error("Playing failed:", err);
    throw err;
  } finally {
    restartLock = false;
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
        userStopped = true;
        player.pause();
        console.log("Button eventListener: pause current station");
      } else {
        userStopped = false;
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
    try {
      userStopped = false;
      await PlayStream();
      console.log("Button eventListener: selected new station");
    } catch (err) {
      console.error(err);
    } finally {
      changingStation = false;
    }
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

// --- Reconnect logic ---
async function reconnect() {
  console.log("Attempting reconnect...");
  await PlayStream();
}
function scheduleReconnect(delay = 2000) {
  if (!currentCard || userStopped) return;
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    await reconnect();
  }, delay);
}

// --- Event listeners for unexpected pauses/errors ---
player.addEventListener("error", () => {
  console.warn("Audio error, checking stream...");
  scheduleReconnect();
});
player.addEventListener("stalled", () => {
  console.warn("Audio stalled, checking stream...");
  scheduleReconnect();
});
player.addEventListener("ended", () => {
  console.warn("Audio ended, checking stream...");
  scheduleReconnect();
});




// --- Set Metadata ---
let metadataTimer = null;
let metadataRunning = false;
const METADATA_INTERVAL = 30000;
async function updateNowPlaying() {
  if (!navigator.onLine) return;
  if (metadataRunning) return;
  metadataRunning = true;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      console.warn("Metadata fetch timeout, aborted");
    }, 10000);
    const res = await fetch("/api/radio", {
      cache: "no-store",
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const stations = data.stations;
    for (const s of stations) {
      const el = document.getElementById(`${s.id}-now-playing`);
      if (!el) continue;
      el.textContent = s.error ? "Niet beschikbaar" : `${s.title} — ${s.artist}`;
      // Update Media Session only for current station
      if (currentCard && currentCard.dataset.stationId === s.id && "mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: s.title || currentCard.dataset.title,
          artist: s.artist || "",
          album: currentCard.dataset.title || "Radio"
        });
      }
    }
  } catch (err) {
    if (err.name === "AbortError") {
      console.warn("Metadata fetch aborted due to timeout");
    } else {
      console.error("Now Playing error:", err);
    }
  } finally {
    metadataRunning = false;
    metadataTimer = setTimeout(updateNowPlaying, METADATA_INTERVAL);
  }
}
function startMetadataUpdates() {
  if (metadataTimer) return;
  console.log("Started metadata updates");
  updateNowPlaying(); // immediate first tick
}
document.addEventListener("DOMContentLoaded", startMetadataUpdates);
