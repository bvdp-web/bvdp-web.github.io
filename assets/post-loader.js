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

  function preprocessMarkdownText(text) {
    // 1. lemma normalization (must be global string)
    text = text.replace(
      /([\u0590-\u05FF\uFB1D-\uFB4F״׳־׃]+)\.(\d+)/g,
      "$2.$1"
    );
    // 2. slash reorder (must be global string)
    const parts = text.split(/\s*\/\s*/);
    if (parts.length > 1) {
      text = parts.join(" / ");
    }
    return text;
  }
  function classifyBlock(text) {
    const hebrew = (text.match(/[\u0590-\u05FF]/g) || []).length;
    const greek = (text.match(/[\u0370-\u03FF\u1F00-\u1FFF]/g) || []).length;
    const latin = /[A-Za-z]{2,}/.test(text);
    if (latin) return null;
    if (hebrew > greek) return "hebrew";
    if (greek > hebrew) return "greek";
    return null;
  }
  function applyBiblicalLanguageSupport(container) {
    const blocks = container.querySelectorAll("h1,h2,h3,h4,h5,h6,p,blockquote");
    const blockMap = new WeakMap();
    // STEP 1: PREPROCESS + CLASSIFY (CRITICAL FIX)
    blocks.forEach(el => {
      const raw = el.textContent;
      const processed = preprocessMarkdownText(raw);
      // store processed text back on element (important)
      el.dataset.processedText = processed;
      const lang = classifyBlock(processed);
      if (lang) blockMap.set(el, lang);
    });
    // STEP 2: RENDER ONLY
    const skip = new Set(["SCRIPT", "STYLE", "CODE", "PRE"]);
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT
    );
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || skip.has(parent.tagName)) continue;
      const block = parent.closest("h1,h2,h3,h4,h5,h6,p,blockquote");
      const blockLang = block ? blockMap.get(block) : null;
      const text = node.nodeValue;
      if (!text || !text.trim()) continue;
      // Only skip inline processing if block is PURE Hebrew/Greek
      if (blockLang) continue;
      wrapInline(node, parent, blockLang);
    }
  }
  function wrapInline(node, parent, blockLang) {
    const isHeading = /^H[1-6]$/.test(parent.tagName);
    const text = node.nodeValue;
    const regex = /([\u0590-\u05FF\uFB1D-\uFB4F״׳־׃]+(?:\s+[\u0590-\u05FF\uFB1D-\uFB4F״׳־׃]+)*)|([\u0370-\u03FF\u1F00-\u1FFF]+)/g;
    const fragment = document.createDocumentFragment();
    let last = 0;
    let m;
    while ((m = regex.exec(text)) !== null) {
      const i = m.index;
      if (i > last) {
        fragment.appendChild(
          document.createTextNode(text.slice(last, i))
        );
      }
      const span = document.createElement("span");
      const isHebrew = !!m[1];
      span.className = isHebrew
        ? (isHeading ? "hebrew-heading" : "hebrew-inline")
        : (isHeading ? "greek-heading" : "greek-inline");
      span.textContent = m[0];
      fragment.appendChild(span);
      last = i + m[0].length;
    }
    if (last < text.length) {
      fragment.appendChild(
        document.createTextNode(text.slice(last))
      );
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
