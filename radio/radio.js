const player = document.getElementById("radioPlayer");
const cards = document.querySelectorAll(".station-card");
const buttons = document.querySelectorAll(".play-btn");
let currentCard = null;
function resetStations() {
  cards.forEach(card => card.classList.remove("active"));
  buttons.forEach(button => {
    button.textContent = "▶ Play";
  });
}
buttons.forEach(button => {
  button.addEventListener("click", async () => {
    const card = button.closest(".station-card");
    const stream = card.dataset.stream;
    // Stop current station
    if (currentCard === card) {
      player.pause();
      player.src = "";
      player.load();
      resetStations();
      currentCard = null;
      return;
    }
    // Stop previous station
    player.pause();
    player.src = "";
    player.load();
    resetStations();
    player.src = stream;
    try {
      await player.play();
      card.classList.add("active");
      button.textContent = "⏹ Stop";
      currentCard = card;
    } catch (err) {
      console.error(err);
    }
  });
});
// Handle cases where playback errors
player.addEventListener("error", () => {
  if (currentCard) {
    const stream = currentCard.dataset.stream;
    setTimeout(async () => {
      try {
        player.src = stream;
        await player.play();
      } catch (err) {
        console.error("Reconnect failed:", err);
      }
    }, 500);
  }
});




async function updateNowPlaying() {
  if (!shouldUpdate()) return;
  try {
    const res = await fetch("https://radio.bvdp.workers.dev/");
    const data = await res.json();
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
let metadataInterval = null;
function shouldUpdate() {
  return !document.hidden && document.hasFocus();
}
function startMetadataUpdates() {
  updateNowPlaying();
  if (!metadataInterval) {
    metadataInterval = setInterval(updateNowPlaying, 30000);
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
    startMetadataUpdates();;
  } else {
    stopMetadataUpdates();
  }
});
