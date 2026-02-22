(async function () {
  const params = new URLSearchParams(window.location.search);
  const post = params.get("post");
  const content = document.getElementById("content");
  if (!content) return;

  const pathParts = window.location.pathname.split("/");
  const section = pathParts.includes("preken") ? "preken" : "artikelen";

  async function loadPost() {
    if (!post) return showNotFound();

    try {
      const res = await fetch(`/${section}/articles/${post}.md`);
      if (!res.ok) throw new Error();

      let md = await res.text();

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
