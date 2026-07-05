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
    // TEXT CLASSIFICATION HELPERS
    function classifyText(text) {
      const latin = /[A-Za-z]{2,}/.test(text);
      const hebrew = (text.match(/[\u0590-\u05FF]/g) || []).length;
      const greek = (text.match(/[\u0370-\u03FF\u1F00-\u1FFF]/g) || []).length;
      if (latin) return null;
      if (hebrew > greek) return "hebrew";
      if (greek > hebrew) return "greek";
      return null;
    }
    function isHebrewSegment(s) {
      return /^[\u0590-\u05FF\uFB1D-\uFB4F״׳־׃\s\.\d]+$/.test(s);
    }
    // PREPROCESSING (IMPORTANT)
    function preprocess(text) {
      // lemma normalization
      text = text.replace(
        /([\u0590-\u05FF\uFB1D-\uFB4F״׳־׃]+)\.(\d+)/g,
        "$2.$1"
      );
      // slash reorder
      const parts = text.split(/\s*\/\s*/);
      if (parts.length > 1 && parts.every(isHebrewSegment)) {
        text = parts.join(" / ");
      }
      return text;
    }
    // INLINE RENDERING (MIXED ONLY)
    function renderInline(text, isHeading, langHint) {
      const fragment = document.createDocumentFragment();
      const regex =
        /([\u0590-\u05FF\uFB1D-\uFB4F״׳־׃]+(?:\s+[\u0590-\u05FF\uFB1D-\uFB4F״׳־׃]+)*)|([\u0370-\u03FF\u1F00-\u1FFF]+)/g;
      let last = 0;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const i = match.index;
        if (i > last) {
          fragment.appendChild(
            document.createTextNode(text.slice(last, i))
          );
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
      return fragment;
    }
    // MAIN PROCESSOR
    function processBlock(el) {
      if (skipTags.has(el.tagName)) return;
      const isHeading = /^H[1-6]$/.test(el.tagName);
      // IMPORTANT: preprocess once per block
      const rawText = el.textContent;
      const text = preprocess(rawText);
      // Split by <br> into logical lines
      const nodes = Array.from(el.childNodes);
      let lineBuffer = [];
      let lineText = "";
      function flushLine() {
        if (!lineText.trim()) return;
        const lang = classifyText(lineText);
        // PURE Hebrew/Greek line → block span only
        if (lang) {
          const span = document.createElement("span");
          span.className = lang === "hebrew" ? "hebrew-block" : "greek-block";
          span.textContent = lineText;
          el.appendChild(span);
          // el.appendChild(document.createElement("br"));
        } else {
          // Mixed → inline processing
          el.appendChild(renderInline(lineText, isHeading, lang));
          el.appendChild(document.createElement("br"));
        }
        lineText = "";
      }
      for (const node of nodes) {
        if (node.nodeName === "BR") {
          flushLine();
          continue;
        }
        if (node.nodeType === 3) {
          lineText += node.nodeValue;
        }
      }
      flushLine();
      // Remove original content safely
      nodes.forEach(n => n.remove());
    }
    // RUN
    const blocks = container.querySelectorAll("h1,h2,h3,h4,h5,h6,p,blockquote");
    blocks.forEach(processBlock);
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
