(async function () {
  // SET BACK BUTTON
  const params = new URLSearchParams(window.location.search);
  const post = params.get("post");
  const content = document.getElementById("content");
  if (!content) return;
  const pathParts = window.location.pathname.split("/");
  const section = pathParts.includes("preken") ? "preken" : "artikelen";
  const backContainer = document.getElementById("back-button");
  if (backContainer) {
    // --- Create back button element ---
    const backBtn = document.createElement("a");
    backBtn.className = "back-btn";
    backBtn.title = "Ga terug naar de vorige pagina";
    backBtn.setAttribute("aria-label", "Ga terug naar de vorige pagina");
    backBtn.textContent = "← Terug naar het overzicht";
    // --- Add dynamic click handler ---
    backBtn.addEventListener("click", e => {
      e.preventDefault();
      // check if the referrer contains artikelen or preken
      if (document.referrer) {
        const ref = document.referrer.toLowerCase();
        if (ref.includes("/artikelen/") || ref.includes("/preken/")) {
          history.back(); // preserves page number/search
          return;
        }
      }
      // fallback: go to section overview
      window.location.href = `/${section}/`;
    });
    backContainer.appendChild(backBtn);
  }

  // APPLY SUPPORT FOR BIBLICAL LANGUAGE
  function applyBiblicalLanguageSupport(container) {
    const skipTags = new Set(["SCRIPT", "STYLE", "CODE", "PRE"]);
    // --- Metadata Stripping ---
    function stripReferenceMetadata(text) {
      return text.replace(/^[A-Za-z]+\s*\d+:\d+\s*/, "").trim();
    }
    // --- Linguistic Classification ---
    function classifyText(text) {
      const cleaned = stripReferenceMetadata(text);
      const tokens = cleaned.split(/\s+/).filter(Boolean);
      let greek = 0;
      let hebrew = 0;
      let latin = 0;
      for (const t of tokens) {
        if (/[\u0370-\u03FF\u1F00-\u1FFF]/.test(t)) greek++;
        else if (/[\u0590-\u05FF]/.test(t)) hebrew++;
        else if (/[A-Za-z]{2,}/.test(t)) latin++;
      }
      const total = tokens.length || 1;
      const greekRatio = greek / total;
      const hebrewRatio = hebrew / total;
      const latinRatio = latin / total;
      if (greekRatio > 0.7 && latinRatio < 0.2) return "greek";
      if (hebrewRatio > 0.7 && latinRatio < 0.2) return "hebrew";
      return null;
    }
    // --- Hebrew Segment Check ---
    function isHebrewSegment(s) {
      return /^[\u0590-\u05FF\uFB1D-\uFB4F״׳־׃\s\.\d]+$/.test(s);
    }
    // --- Preprocess ---
    function preprocess(text) {
      // lemma normalization
      text = text.replace(/([\u0590-\u05FF\uFB1D-\uFB4F״׳־׃]+)\.(\d+)/g, "$2.$1");
      return text;
    }
    // --- Inline Wrapper ---
    function renderInline(text, isHeading) {
      const fragment = document.createDocumentFragment();
      const regex = /([\u0590-\u05FF\uFB1D-\uFB4F״׳־׃]+(?:\s+[\u0590-\u05FF\uFB1D-\uFB4F״׳־׃]+)*)|([\u0370-\u03FF\u1F00-\u1FFF]+)/g;
      let last = 0;
      let m;
      while ((m = regex.exec(text)) !== null) {
        const i = m.index;
        if (i > last) {
          fragment.appendChild(document.createTextNode(text.slice(last, i)));
        }
        const span = document.createElement("span");
        const isHeb = !!m[1];
        span.className = isHeb
          ? (isHeading ? "hebrew-heading" : "hebrew-inline")
          : (isHeading ? "greek-heading" : "greek-inline");
        span.textContent = m[0];
        fragment.appendChild(span);
        last = i + m[0].length;
      }
      if (last < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(last)));
      }
      return fragment;
    }
    // --- Text Node Walker
    function walkTextNodes(root) {
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            if (skipTags.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
            // if (parent.closest(".footnotes")) return NodeFilter.FILTER_REJECT;
            if (!node.nodeValue || !node.nodeValue.trim()) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      return nodes;
    }
    // --- Main Processor ---
    function process(container) {
      const textNodes = walkTextNodes(container);
      for (const node of textNodes) {
        const raw = node.nodeValue;
        const text = preprocess(raw);
        const lang = classifyText(text);
        const isHeading =
          node.parentElement &&
          /^H[1-6]$/.test(node.parentElement.tagName);
        if (lang === "hebrew" || lang === "greek") {
          const span = document.createElement("span");
          span.className =lang === "hebrew" ? "hebrew-block" : "greek-block";
          span.textContent = text;
          node.replaceWith(span);
          continue;
        }
        // mixed or neutral → inline processing
        node.replaceWith(renderInline(text, isHeading));
      }
    }
    // --- Run ---
    process(container);
  }

  // LOAD POST USING MARKDOWN PARSER
  // --- Set Markdown-It options
  const md = window.markdownit({
    html: true,
    linkify: true,
    typographer: false
  }).use(window.markdownitFootnote)
    .use(window.markdownitSub)
    .use(window.markdownitSup)
    .use(window.markdownitMark);
  // --- LoadPost Function ---
  async function loadPost() {
    if (!post) return showNotFound();
    try {
      const res = await fetch(`/${section}/articles/${post}.md`);
      if (!res.ok) throw new Error();
      let text = await res.text();
      // remove YAML front matter if present
      text = text.replace(/^---\s*[\s\S]*?---\s*/, "");
      content.innerHTML = md.render(text);
      requestAnimationFrame(() => {
        applyBiblicalLanguageSupport(content);
      });
    } catch {
      showNotFound();
    }
  }
  // --- When Post Not Found
  function showNotFound() {
    content.innerHTML = `
      <h1>Helaas... Niet gevonden.</h1>
    `;
  }

  loadPost();
})();
