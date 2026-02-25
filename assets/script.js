// Menu
function initNavbar() {
  const links = document.querySelectorAll("nav a");
  const currentPath = window.location.pathname;
  links.forEach(link => {
    const href = link.getAttribute("href");
    // Ensure href ends with a slash if it's a directory
    const normalizedHref = href.endsWith("/") ? href : href + "/";
    // Normalize current path for comparison
    const normalizedPath = currentPath.endsWith("/") ? currentPath : currentPath + "/";
    // Check if current path starts with href
    if (normalizedPath.startsWith(normalizedHref)) {
      link.classList.add("active");
    }
  });
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
}

// Youtube embeds
document.querySelectorAll(".youtube .thumbnail").forEach(thumb => {
  thumb.addEventListener("click", () => {
    const card = thumb.closest(".card");
    const videoUrl = card.dataset.video;
    if (card.classList.contains("loaded")) return;
    const iframe = document.createElement("iframe");
    iframe.src = videoUrl + "&autoplay=1&shuffle=1&loop=1";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    iframe.style.width = "100%";
    iframe.style.aspectRatio = "16/9";
    iframe.style.borderRadius = "10px";
    iframe.style.border = "0";
    thumb.replaceWith(iframe);
    card.classList.add("loaded");
  });
});
