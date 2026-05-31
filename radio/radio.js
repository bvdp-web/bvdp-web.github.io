const player = document.getElementById("radioPlayer");
const volume = document.getElementById("volume");
const nowPlaying = document.getElementById("nowPlaying");
document.querySelectorAll(".play-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document
            .querySelectorAll(".station-card")
            .forEach(card => card.classList.remove("active"));
        const card = btn.closest(".station-card");
        card.classList.add("active");
        const stream = card.dataset.stream;
        const name = card.dataset.name;
        player.src = stream;
        player.play();
        nowPlaying.textContent =
            "Now playing: " + name;
    });
});
document
    .getElementById("pauseBtn")
    .addEventListener("click", () => {
        player.pause();
    });
volume.addEventListener("input", () => {
    player.volume = volume.value;
});
player.volume = 0.8;
