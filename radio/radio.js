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
