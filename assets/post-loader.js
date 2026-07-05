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
    const skipTags = new Set(["CODE", "PRE", "SCRIPT", "STYLE"]);
    const hebrewRegex = /[\u0590-\u05FF\uFB1D-\uFB4F״׳־׃]/;
    const greekRegex = /[\u0370-\u03FF\u1F00-\u1FFF]/;
    const isHebrewSegment = (s) =>
      /^[\u0590-\u05FF\uFB1D-\uFB4F״׳־׃\s\.\d]+$/.test(s);
    // --- BLOCK LANGUAGE DETECTION ---
    function getBlockLanguage(el) {
      const text = el.textContent.trim();
      const hebrew = (text.match(/[\u0590-\u05FF]/g) || []).length;
      const greek = (text.match(/[\u0370-\u03FF\u1F00-\u1FFF]/g) || []).length;
      const latin = (text.match(/[A-Za-z]{2,}/g) || []).length;
      if (latin) return null;
      if (hebrew > greek) return "hebrew";
      if (greek > hebrew) return "greek";
      return null;
    }
    const blockLangMap = new WeakMap();
    function processTextNode(node, isHeading) {
      const originalText = node.nodeValue;
      if (!originalText || !originalText.trim()) return;
      let text = originalText;
      // 1. lemma normalization (safe here, still contiguous text node)
      text = text.replace(
        /([\u0590-\u05FF\uFB1D-\uFB4F״׳־׃]+)\.(\d+)/g,
        "$2.$1"
      );
      // 2. slash reorder
      const parts = text.split(/\s*\/\s*/);
      if (parts.length > 1 && parts.every(isHebrewSegment)) {
        text = parts.reverse().join(" / ");
      }
      const fragment = document.createDocumentFragment();
      const combinedRegex =
        /([\u0590-\u05FF\uFB1D-\uFB4F״׳־׃]+(?:\s+[\u0590-\u05FF\uFB1D-\uFB4F״׳־׃]+)*)|([\u0370-\u03FF\u1F00-\u1FFF]+)/g;
      let lastIndex = 0;
      let match;
      const parentBlock = node.parentElement?.closest("h1,h2,h3,h4,h5,h6,p,blockquote");
      const blockLang = parentBlock ? blockLangMap.get(parentBlock) : null;
      while ((match = combinedRegex.exec(text)) !== null) {
        const offset = match.index;
        if (offset > lastIndex) {
          fragment.appendChild(
            document.createTextNode(text.slice(lastIndex, offset))
          );
        }
        const span = document.createElement("span");
        const isHebrew = !!match[1];
        if (isHebrew) {
          span.className =
            blockLang === "hebrew"
              ? "hebrew-block"
              : isHeading
                ? "hebrew-heading"
                : "hebrew-inline";
        } else {
          span.className =
            blockLang === "greek"
              ? "greek-block"
              : isHeading
                ? "greek-heading"
                : "greek-inline";
        }
        span.textContent = match[0];
        fragment.appendChild(span);
        lastIndex = offset + match[0].length;
      }
      if (lastIndex < text.length) {
        fragment.appendChild(
          document.createTextNode(text.slice(lastIndex))
        );
      }
      node.parentNode.replaceChild(fragment, node);
    }
    function walk(el) {
      if (skipTags.has(el.tagName)) return;
      const isHeading = /^H[1-6]$/.test(el.tagName);
      const isBlock = /^H[1-6]|P|BLOCKQUOTE$/.test(el.tagName);
      // store block language BEFORE mutation
      if (isBlock) {
        const lang = getBlockLanguage(el);
        if (lang) blockLangMap.set(el, lang);
      }
      const walker = document.createTreeWalker(
        el,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            if (!node.nodeValue || !node.nodeValue.trim()) {
              return NodeFilter.FILTER_REJECT;
            }
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            if (skipTags.has(parent.tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const node of nodes) {
        const heading = node.parentElement &&
          /^H[1-6]$/.test(node.parentElement.tagName);
        processTextNode(node, heading);
      }
    }

    function detectLanguageBlocks(container) {
      const paragraphs = container.querySelectorAll("p, blockquote");
      paragraphs.forEach(p => {
        const text = p.textContent.trim();
        if (!text) return;
        const hebrew = text.match(/[\u0590-\u05FF]/g) || [];
        const greek = text.match(/[\u0370-\u03FF\u1F00-\u1FFF]/g) || [];
        const latinWords = text.match(/[A-Za-z]{2,}/g);
        if (!latinWords) {
          if (hebrew.length > greek.length) {
            p.classList.add("hebrew-block");
          } else if (greek.length > hebrew.length) {
            p.classList.add("greek-block");
          }
        }
      });
    }
    walk(container);
    detectLanguageBlocks(container);
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
