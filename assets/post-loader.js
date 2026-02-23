(async function () {
  const params = new URLSearchParams(window.location.search);
  const post = params.get("post");
  const content = document.getElementById("content");
  if (!content) return;

  const pathParts = window.location.pathname.split("/");
  const section = pathParts.includes("preken") ? "preken" : "artikelen";

  const backContainer = document.getElementById("back-button");
  if (backContainer) {
    // Create back button element
    const backBtn = document.createElement("a");
    backBtn.className = "back-btn";
    backBtn.href = "#"; // <-- prevents default navigation
    backBtn.title = "Ga terug naar de vorige pagina";
    backBtn.setAttribute("aria-label", "Ga terug naar de vorige pagina");
    backBtn.textContent = "← Terug naar het overzicht";

    // Add dynamic click handler
    backBtn.addEventListener("click", e => {
      e.preventDefault();

      // Check if the referrer contains artikelen or preken
      if (document.referrer) {
        const ref = document.referrer.toLowerCase();
        if (ref.includes("/artikelen/") || ref.includes("/preken/")) {
          history.back(); // preserves page number/search
          return;
        }
      }

      // Fallback: go to section overview
      window.location.href = `/${section}/`;
    });

    backContainer.appendChild(backBtn);
  }

  async function loadPost() {
    if (!post) return showNotFound();

    try {
      const res = await fetch(`/${section}/articles/${post}.md`);
      if (!res.ok) throw new Error();

      let md = await res.text();

      // Remove YAML front matter if present
      md = md.replace(/^---\s*[\s\S]*?---\s*/, "");

      content.innerHTML = marked.parse(md);
    } catch {
      showNotFound();
    }
  }

  function showNotFound() {
    content.innerHTML = `
      <h1>Helaas... Niet gevonden.</h1>
      <a href="/${section}/">Terug naar het overzicht van de ${section}</a>
    `;
  }

  loadPost();
})();
