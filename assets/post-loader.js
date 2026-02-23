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
    const hebrewChar = /[\u0590-\u05FF\uFB1D-\uFB4F]/;
    const greekChar = /[\u0370-\u03FF\u1F00-\u1FFF]/;
    const hebrewWord = /([\u0590-\u05FF\uFB1D-\uFB4F״׳־׃]+)/g;
    const greekWord = /([\u0370-\u03FF\u1F00-\u1FFF]+)/g;
    const skipTags = ["CODE", "PRE", "SCRIPT", "STYLE"];
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          if (skipTags.includes(node.parentNode.nodeName))
            return NodeFilter.FILTER_REJECT;
  
          if (
            hebrewChar.test(node.nodeValue) ||
            greekChar.test(node.nodeValue)
          ) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        }
      }
    );
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }
    textNodes.forEach(textNode => {
      const parent = textNode.parentNode;
      const text = textNode.nodeValue;
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      const combinedRegex = /([\u0590-\u05FF\uFB1D-\uFB4F״׳־׃]+(?:\s+[\u0590-\u05FF\uFB1D-\uFB4F״׳־׃]+)*)|([\u0370-\u03FF\u1F00-\u1FFF]+)/g;
      text.replace(combinedRegex, (match, hebrewMatch, greekMatch, offset) => {
        if (offset > lastIndex) {
          fragment.appendChild(
            document.createTextNode(text.slice(lastIndex, offset))
          );
        }
        const span = document.createElement("span");
        if (hebrewMatch) {
          span.className = /H[1-6]/.test(parent.nodeName)
            ? "hebrew-heading"
            : "hebrew-inline";
        } else {
          span.className = /H[1-6]/.test(parent.nodeName)
            ? "greek-heading"
            : "greek-inline";
        }
        span.textContent = match;
        fragment.appendChild(span);
        lastIndex = offset + match.length;
      });
      if (lastIndex < text.length) {
        fragment.appendChild(
          document.createTextNode(text.slice(lastIndex))
        );
      }
      parent.replaceChild(fragment, textNode);
    });
    detectLanguageBlocks(container);
  }
  
  function detectLanguageBlocks(container) {
    const paragraphs = container.querySelectorAll("p, blockquote");
    paragraphs.forEach(p => {
      const text = p.textContent.trim();
      if (!text) return;
      const hebrewCount =
        (text.match(/[\u0590-\u05FF]/g) || []).length;
      const greekCount =
        (text.match(/[\u0370-\u03FF\u1F00-\u1FFF]/g) || []).length;
      const ratio = (hebrewCount + greekCount) / text.length;
      if (ratio > 0.6) {
        if (hebrewCount > greekCount) {
          p.classList.add("hebrew-block");
        } else {
          p.classList.add("greek-block");
        }
      }
    });
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
        applyBiblicalLanguageSupport(container);
      });
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
