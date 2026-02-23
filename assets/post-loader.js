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
  
  function applyHebrewSupport(container) {
    // Full Hebrew range + punctuation
    const hebrewRegex = /[\u0590-\u05FF\uFB1D-\uFB4F]/;
    const hebrewWordRegex = /([\u0590-\u05FF\uFB1D-\uFB4F״׳־׃]+)/g;
  
    const skipTags = ["CODE", "PRE", "SCRIPT", "STYLE"];
  
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
  
          if (!hebrewRegex.test(node.nodeValue))
            return NodeFilter.FILTER_REJECT;
  
          if (
            skipTags.includes(node.parentNode.nodeName) ||
            node.parentNode.classList?.contains("hebrew-inline") ||
            node.parentNode.classList?.contains("hebrew-heading")
          )
            return NodeFilter.FILTER_REJECT;
  
          return NodeFilter.FILTER_ACCEPT;
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
  
      text.replace(hebrewWordRegex, (match, _group, offset) => {
        if (offset > lastIndex) {
          fragment.appendChild(
            document.createTextNode(text.slice(lastIndex, offset))
          );
        }
  
        const span = document.createElement("span");
  
        // Heading detection
        if (/H[1-6]/.test(parent.nodeName)) {
          span.className = "hebrew-heading";
        } else {
          span.className = "hebrew-inline";
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
  
    detectFullHebrewBlocks(container);
  }
  
  function detectFullHebrewBlocks(container) {
    const paragraphs = container.querySelectorAll("p, blockquote");
  
    paragraphs.forEach(p => {
      const text = p.textContent.trim();
      if (!text) return;
  
      const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
      const ratio = hebrewChars / text.length;
  
      // If > 60% Hebrew → treat as full Hebrew block
      if (ratio > 0.6) {
        p.classList.add("hebrew-block");
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
        applyHebrewSupport(content);
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
