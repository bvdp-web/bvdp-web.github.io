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
  try {
    // Groot Nieuws Radio
    const response = await fetch("https://api.grootnieuwsradio.nl/static/now-playing.json");
    const data = await response.json();
    const gnr = data.stations["groot-nieuws-radio"];
    const nonstop = data.stations["non-stop"];
    const blijdeKlanken = data.stations["blijde-klanken"];
    document.getElementById("gnr-now-playing").textContent = `${gnr.title} — ${gnr.artist}`;
    document.getElementById("gnr-ns-now-playing").textContent = `${nonstop.title} — ${nonstop.artist}`;
    document.getElementById("gnr-bk-now-playing").textContent = `${blijdeKlanken.title} — ${blijdeKlanken.artist}`;
    // Christelijke Omroep
    const coResponse = await fetch("https://christelijkeomroep.nl/custom/ajax/getnextplaying.ajax.php");
    const coText = (await coResponse.text()).trim();
    const parts = coText.split(" - ");
    if (parts.length >= 2) {
      const artist = parts[0];
      const title = parts.slice(1).join(" - ");
      document.getElementById("co-now-playing").textContent = `${title} — ${artist}`;
    } else {
      document.getElementById("co-now-playing").textContent = coText;
    }
  } catch (err) {
    console.error("Now Playing error:", err);
  }
}
updateNowPlaying();
setInterval(updateNowPlaying, 30000);
