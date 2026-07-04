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
    const isHebrewBlock = (t) => {
      const latinWords = t.match(/[A-Za-z]{2,}/g);
      return !latinWords;
    };
    const isHebrewSegment = (s) =>
      /^[\u0590-\u05FF\uFB1D-\uFB4F״׳־׃\s\.\d]+$/.test(s);
    const blocks = container.querySelectorAll("h1, h2, h3, h4, h5, h6, p, blockquote");
    blocks.forEach(el => {
      if (skipTags.has(el.tagName)) return;
      const originalText = el.textContent.trim();
      if (!originalText) return;
      let text = originalText;
      const originalHebrewBlock = isHebrewBlock(originalText);
      // 1. lemma normalization (only outside Hebrew blocks)
      if (!originalHebrewBlock) {
        text = text.replace(
          /([\u0590-\u05FF\uFB1D-\uFB4F״׳־׃]+)\.(\d+)/g,
          "$2.$1"
        );
      }
      // 2. slash reorder (only outside Hebrew blocks)
      if (!originalHebrewBlock) {
        const parts = text.split(/\s*\/\s*/);
        if (parts.length > 1 && parts.every(isHebrewSegment)) {
          text = parts.reverse().join(" / ");
        }
      }
      // 3. rendering decision
      const fragment = document.createDocumentFragment();
      if (originalHebrewBlock) {
        fragment.appendChild(document.createTextNode(text));
      } else {
        let lastIndex = 0;
        const combinedRegex =
          /([\u0590-\u05FF\uFB1D-\uFB4F״׳־׃]+(?:\s+[\u0590-\u05FF\uFB1D-\uFB4F״׳־׃]+)*)|([\u0370-\u03FF\u1F00-\u1FFF]+)/g;
        text.replace(combinedRegex, (match, hebrewMatch, greekMatch, offset) => {
          if (offset > lastIndex) {
            fragment.appendChild(
              document.createTextNode(text.slice(lastIndex, offset))
            );
          }
          const span = document.createElement("span");
          if (hebrewMatch) {
            span.className = /H[1-6]/.test(el.nodeName)
              ? "hebrew-heading"
              : "hebrew-inline";
          } else {
            span.className = /H[1-6]/.test(el.nodeName)
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
      }
      el.replaceChildren(fragment);
    });
    detectLanguageBlocks(container);
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
