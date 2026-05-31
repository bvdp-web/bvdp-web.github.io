const player = document.getElementById("radioPlayer");
const cards = document.querySelectorAll(".station-card");
const buttons = document.querySelectorAll(".play-btn");
let currentCard = null;
buttons.forEach(button => {
  button.addEventListener("click", async () => {
    const card = button.closest(".station-card");
    const stream = card.dataset.stream;
    // Toggle pause/play on current station
    if (currentCard === card) {
      player.pause();
      card.classList.remove("active");
      button.textContent = "▶ Play";
      currentCard = null;
      return;
    }
    // Stop previous station
    player.pause();
    player.src = "";
    // Reset all buttons/cards
    cards.forEach(c => c.classList.remove("active"));
    buttons.forEach(b => b.textContent = "▶ Play");
    // Start selected station
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
