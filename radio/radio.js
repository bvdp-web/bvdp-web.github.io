const player = document.getElementById("radioPlayer");

const cards = document.querySelectorAll(".station-card");
const buttons = document.querySelectorAll(".play-btn");

let currentCard = null;

buttons.forEach(button => {

    button.addEventListener("click", async () => {

        const card = button.closest(".station-card");
        const stream = card.dataset.stream;

        // Same station clicked
        if (currentCard === card) {

            if (!player.paused) {
                player.pause();

                card.classList.remove("active");
                button.textContent = "▶ Play";
            } else {
                await player.play();

                card.classList.add("active");
                button.textContent = "⏸ Pause";
            }

            return;
        }

        // Reset all stations
        cards.forEach(c => c.classList.remove("active"));
        buttons.forEach(b => b.textContent = "▶ Play");

        // Start new station
        player.src = stream;

        try {
            await player.play();

            card.classList.add("active");
            button.textContent = "⏸ Pause";

            currentCard = card;

        } catch (err) {
            console.error(err);
        }
    });

});

// If stream stops unexpectedly
player.addEventListener("pause", () => {
    if (currentCard) {
        currentCard.querySelector(".play-btn").textContent = "▶ Play";
    }
});

player.addEventListener("play", () => {
    if (currentCard) {
        currentCard.querySelector(".play-btn").textContent = "⏸ Pause";
    }
});
