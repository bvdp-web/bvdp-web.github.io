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

  const hasHebrew = /\p{Script=Hebrew}/u;
  const hasGreek = /\p{Script=Greek}/u;
  const hasLatin = /[A-Za-z]{2,}/;
  const blockMap = new WeakMap();
  function classifyBlock(text) {
    const hebrew = (text.match(/\p{Script=Hebrew}/gu) || []).length;
    const greek = (text.match(/\p{Script=Greek}/gu) || []).length;
    const latin = /[A-Za-z]{2,}/.test(text);
    if (latin) return null;
    if (hebrew > greek) return "hebrew";
    if (greek > hebrew) return "greek";
    return null;
  }
  function applyBiblicalLanguageSupport(container) {
    const blocks = container.querySelectorAll("h1,h2,h3,h4,h5,h6,p,blockquote");
    // STAGE 1: classify
    blocks.forEach(el => {
      const lang = classifyBlock(el.textContent);
      if (lang) blockMap.set(el, lang);
    });
    // STAGE 2: inline processing only where needed
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const skip = new Set(["SCRIPT","STYLE","CODE","PRE"]);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || skip.has(parent.tagName)) continue;
      let block = blockCache.get(parent);
      if (!block) {
        block = parent.closest("h1,h2,h3,h4,h5,h6,p,blockquote");
        blockCache.set(parent, block);
      }
      const blockLang = block ? blockMap.get(block) : null;
      const text = node.nodeValue;
      if (!text || !text.trim()) continue;
      // If whole block is Hebrew/Greek → do NOTHING inline
      if (blockLang) continue;
      // Only mixed blocks get processed
      wrapInline(node, parent, block);
    }
  }
  function wrapInline(node, parent, block) {
    const isHeading = /^H[1-6]$/.test(parent.tagName);
    const text = node.nodeValue;
    const regex = /([\p{Script=Hebrew}]+)|([\p{Script=Greek}]+)/gu;
    const fragment = document.createDocumentFragment();
    let last = 0;
    let m;
    while ((m = regex.exec(text)) !== null) {
      const i = m.index;
      if (i > last) {
        fragment.appendChild(document.createTextNode(text.slice(last, i)));
      }
      const span = document.createElement("span");
      const isHebrew = !!m[1];
      span.className =
        isHebrew
          ? (isHeading ? "hebrew-heading" : "hebrew-inline")
          : (isHeading ? "greek-heading" : "greek-inline");
      span.textContent = m[0];
      fragment.appendChild(span);
      last = i + m[0].length;
    }
    if (last < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(last)));
    }
    node.replaceWith(fragment);
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
      requestAnimationFrame(() => {
        applyBiblicalLanguageSupport(content);
      });
    } catch {
      showNotFound();
    }
  }

  function showNotFound() {
    content.innerHTML = `
      <h1>Helaas... Niet gevonden.</h1>
    `;
  }

  loadPost();
})();
