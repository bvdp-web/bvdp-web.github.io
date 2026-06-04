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
  } catch (err) {
    console.error("Playing failed:", err);
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
      } else {
        userStopped = false;
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
    try {
      userStopped = false;
      await PlayStream();
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
    return;
  }
  updateCurrentButton();
});
player.addEventListener("pause", () => {
  updateCurrentButton();
});

// --- Reconnect logic ---
async function reconnect() {
  await PlayStream();
}
function scheduleReconnect(delay = 2000) {
  if (!currentCard || userStopped) return;
  if (reconnectTimer) return; // already scheduled
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    await reconnect();
  }, delay);
}

// --- Event listeners for unexpected pauses/errors ---
player.addEventListener("error", () => {
  console.warn("Audio error, checking stream...");
  scheduleReconnect(1000);
});
player.addEventListener("stalled", () => {
  console.warn("Audio stalled, checking stream...");
  scheduleReconnect(1000);
});
player.addEventListener("ended", () => {
  console.warn("Audio ended, checking stream...");
  scheduleReconnect(1000);
});




// --- Set Metadata ---
let metadataInterval = null;
let lastMetadataFetch = 0;
const METADATA_INTERVAL = 30000;
async function updateNowPlaying() {
  if (!shouldUpdate()) return;
  if (!navigator.onLine) return;
  const now = Date.now();
  if (now - lastMetadataFetch < METADATA_INTERVAL) {
    return;
  }
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
}
function shouldUpdate() {
  return !document.hidden;
}
function startMetadataUpdates() {
  updateNowPlaying();
  if (!metadataInterval) {
    metadataInterval = setInterval(updateNowPlaying, METADATA_INTERVAL);
  }
}
function stopMetadataUpdates() {
  if (metadataInterval) {
    clearInterval(metadataInterval);
    metadataInterval = null;
  }
}
if (shouldUpdate()) {
  startMetadataUpdates();
}
document.addEventListener("visibilitychange", () => {
  if (shouldUpdate()) {
    startMetadataUpdates();
  } else {
    stopMetadataUpdates();
  }
});
window.addEventListener("focus", startMetadataUpdates);
window.addEventListener("blur", stopMetadataUpdates);
