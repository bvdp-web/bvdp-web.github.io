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

  function applyBiblicalLanguageSupport(container) {
    const skipTags = new Set(["SCRIPT", "STYLE", "CODE", "PRE"]);
    const blockLangMap = new WeakMap();
    function getBlockLanguage(el) {
      const text = el.textContent.trim();
      const hebrew = (text.match(/[\u0590-\u05FF]/g) || []).length;
      const greek = (text.match(/[\u0370-\u03FF\u1F00-\u1FFF]/g) || []).length;
      const latin = (text.match(/[A-Za-z]{2,}/g) || []).length;
      if (hebrew) {
        if (latin) return null;
      }
      if (hebrew > greek) return "hebrew";
      if (greek > latin) return "greek";
      return null;
    }
    function isHebrewSegment(s) {
      return /^[\u0590-\u05FF\uFB1D-\uFB4F״׳־׃\s\.\d]+$/.test(s);
    }
    function processTextNode(node, isHeading, blockLang) {
      const originalText = node.nodeValue;
      if (!originalText || !originalText.trim()) return;
      let text = originalText;
      // lemma normalization
      text = text.replace(
        /([\u0590-\u05FF\uFB1D-\uFB4F״׳־׃]+)\.(\d+)/g,
        "$2.$1"
      );
      // slash reorder
      const parts = text.split(/\s*\/\s*/);
      if (parts.length > 1 && parts.every(isHebrewSegment)) {
        text = parts.reverse().join(" / ");
      }
      const regex =
        /([\u0590-\u05FF\uFB1D-\uFB4F״׳־׃]+(?:\s+[\u0590-\u05FF\uFB1D-\uFB4F״׳־׃]+)*)|([\u0370-\u03FF\u1F00-\u1FFF]+)/g;
      const fragment = document.createDocumentFragment();
      let last = 0;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const i = match.index;
        if (i > last) {
          fragment.appendChild(document.createTextNode(text.slice(last, i)));
        }
        const span = document.createElement("span");
        const isHebrew = !!match[1];
        span.className = isHebrew
          ? (isHeading ? "hebrew-heading" : "hebrew-inline")
          : (isHeading ? "greek-heading" : "greek-inline");
        span.textContent = match[0];
        fragment.appendChild(span);
        last = i + match[0].length;
      }
      if (last < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(last)));
      }
      node.parentNode.replaceChild(fragment, node);
    }
    function walk(el) {
      if (skipTags.has(el.tagName)) return;
      const blocks = el.querySelectorAll("h1,h2,h3,h4,h5,h6,p,blockquote");
      // STEP 1: classify blocks
      blocks.forEach(b => {
        const lang = getBlockLanguage(b);
        if (lang) {
          b.classList.add(lang + "-block");
          blockLangMap.set(b, lang);
        }
      });
      // STEP 2: inline processing ONLY for non-block-language blocks
      const walker = document.createTreeWalker(
        el,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            if (skipTags.has(parent.tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
            const block = parent.closest("h1,h2,h3,h4,h5,h6,p,blockquote");
            const blockLang = block ? blockLangMap.get(block) : null;
            // Skip ALL inline parsing in block-mode elements
            if (blockLang) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const node of nodes) {
        const isHeading =
          node.parentElement &&
          /^H[1-6]$/.test(node.parentElement.tagName);
        const block = node.parentElement?.closest("h1,h2,h3,h4,h5,h6,p,blockquote");
        const blockLang = block ? blockLangMap.get(block) : null;
        processTextNode(node, isHeading, blockLang);
      }
    }
    walk(container);
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
