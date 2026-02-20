// Hamburger toggle
document.getElementById("hamburger")
  .addEventListener("click", function() {
    document.querySelector(".nav-links")
      .classList.toggle("active");
});

// Dark mode toggle
const toggle = document.getElementById("darkToggle");

if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
}

toggle?.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  if (document.body.classList.contains("dark")) {
    localStorage.setItem("theme", "dark");
  } else {
    localStorage.setItem("theme", "light");
  }
});


// Youtube embeds
document.querySelectorAll(".youtube .card").forEach(card => {
  card.addEventListener("click", () => {
    const videoUrl = card.dataset.video;
    if (!card.querySelector("iframe")) {
      card.innerHTML = `
        <iframe 
          src="${videoUrl}&autoplay=1" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen
          style="width:100%; height:100%; aspect-ratio:16/9; border-radius:10px;"
        ></iframe>
      `;
    }
  });
});

