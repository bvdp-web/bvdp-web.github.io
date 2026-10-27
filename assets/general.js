if (window.matchMedia("(prefers-color-scheme: dark)").matches || localStorage.getItem("theme") !== "light") {
  document.documentElement.classList.add("dark");
}
function loadPartial(id, file, callback) {
  fetch(file)
    .then(response => {
      if (!response.ok) throw new Error("Network error");
      return response.text();
    })
    .then(data => {
      document.getElementById(id).innerHTML = data;
      if (callback) callback();
    })
    .catch(error => console.error("MENU Error loading:", file, error));
}
document.addEventListener("DOMContentLoaded", function() {
  loadPartial("navbar", "/navfooter/navbar.html", function() {
    initNavbar();
    document.getElementById("navbar").classList.add("visible");
  });
  loadPartial("footer", "/navfooter/footer.html", function() {
    document.getElementById("footer").classList.add("visible");
  });
});
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
    // Homepage: only active on the homepage
    if (href === "/") {
      if (currentPath === "/") {
        link.classList.add("active");
      }
      return;
    }
    // Check if current path starts with href
    if (normalizedPath.startsWith(normalizedHref)) {
      link.classList.add("active");
    }
  });
  // Hamburger toggle
  const navbar = document.getElementById("navbar");
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.querySelector(".nav-links");
  hamburger.addEventListener("click", function (event) {
    event.stopPropagation();
    navLinks.classList.toggle("active");
  });
  document.addEventListener("click", function (event) {
    if (!navbar.contains(event.target)) {
      navLinks.classList.remove("active");
    }
  });
  // Dark mode toggle
  const toggle = document.getElementById("darkToggle");
  toggle?.addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");
    const isDark = document.documentElement.classList.contains("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });
}
