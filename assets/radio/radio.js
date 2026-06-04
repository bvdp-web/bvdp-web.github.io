const player = document.getElementById("radioPlayer");
const cards = document.querySelectorAll(".station-card");
const buttons = document.querySelectorAll(".play-btn");

let currentCard = null;
let reconnectTimer = null;
let userStopped = false;

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

// --- Reconnect logic ---
async function reconnect() {
  if (!currentCard || userStopped) return;
  const stream = currentCard.dataset.stream;
  try {
    player.pause();
    player.src = stream;
    await player.play();
    console.log("Reconnected");
  } catch (err) {
    console.error("Reconnect failed:", err);
  }
}
function scheduleReconnect(delay = 1000) {
  if (!currentCard || userStopped) return;
  if (reconnectTimer) return; // already scheduled
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    await reconnect();
  }, delay);
}

// --- Button click handler ---
buttons.forEach(button => {
  button.addEventListener("click", async () => {
    const card = button.closest(".station-card");
    const stream = card.dataset.stream;
    // Current station clicked
    if (currentCard === card) {
      // Resume if paused intentionally
      if (player.paused) {
        userStopped = false;
        player.pause();
        player.src = "";
        player.load();
        player.src = stream;
        try {
          await player.play();
        } catch (err) {
          console.error("Resume failed:", err);
        }
        return;
      }
      // Pause intentionally
      userStopped = true;
      player.pause();
      return;
    }
    // Stop previous station
    userStopped = false;
    player.pause();
    resetStations();
    currentCard = card;
    card.classList.add("active");
    player.src = stream;
    try {
      await player.play();
    } catch (err) {
      console.error("Playback failed:", err.name, err.message);
      resetStations();
      currentCard = null;
    }
  });
});

// --- Event listeners for intended pauses ---
player.addEventListener("play", updateCurrentButton);
player.addEventListener("pause", updateCurrentButton);

// --- Event listeners for unexpected pauses/errors ---
player.addEventListener("error", () => {
  console.warn("Audio error, checking stream...");
  scheduleReconnect(1000);
});
player.addEventListener("stalled", () => {
  console.warn("Audio stalled, checking stream...");
  scheduleReconnect(1000);
});
player.addEventListener("suspend", () => {
  console.warn("Audio suspended, checking stream...");
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
