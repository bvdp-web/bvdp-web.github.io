function initPosts(section) {
  const POSTS_PER_PAGE = 5;
  const MAX_VISIBLE_PAGES = 5;
  const MOBILE_BREAKPOINT = 640;
  const DEBOUNCE_DELAY = 500;

  let currentPage = getPageFromURL();
  let searchTerm = getSearchFromURL();
  let masterPosts = [];
  let filteredPosts = [];

  const container = document.getElementById("posts");
  const pagination = document.getElementById("pagination");
  const searchInput = document.getElementById("search");

  if (searchInput) searchInput.value = searchTerm;

  fetch(`/${section}/posts.json`)
    .then(res => res.json())
    .then(data => {
      masterPosts = data.sort((a, b) => new Date(b.date) - new Date(a.date));
      applyFilter();
      renderPage();
    });

  function getTotalPages() {
    return Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  }

  function getPageFromURL() {
    const params = new URLSearchParams(window.location.search);
    return parseInt(params.get("page")) || 1;
  }

  function getSearchFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("search") || "";
  }

  function updateURL() {
    const url = new URL(window.location);
    url.searchParams.set("page", currentPage);

    if (searchTerm) {
      url.searchParams.set("search", searchTerm);
    } else {
      url.searchParams.delete("search");
    }

    window.history.replaceState({}, "", url);
  }

  function applyFilter() {
    if (!searchTerm) {
      filteredPosts = [...masterPosts];
    } else {
      const term = searchTerm.toLowerCase();
      filteredPosts = masterPosts.filter(post =>
        post.title.toLowerCase().includes(term) ||
        post.description.toLowerCase().includes(term)
      );
    }

    if (currentPage > getTotalPages()) currentPage = 1;
  }

  function renderPage() {
    container.innerHTML = "";

    const start = (currentPage - 1) * POSTS_PER_PAGE;
    const end = start + POSTS_PER_PAGE;
    const pagePosts = filteredPosts.slice(start, end);

    pagePosts.forEach(post => {
      container.innerHTML += `
        <div class="card">
          <h2>${post.title}</h2>
          <small>${post.date || "Geen datum beschikbaar"}</small>
          <p>${post.description}</p>
          <a href="/${section}/post.html?post=${post.file}" class="button">Lezen</a>
        </div>
      `;
    });

    updateURL();
    renderPagination();
  }

  function renderPagination() {
    const totalPages = getTotalPages();
    pagination.innerHTML = "";

    if (totalPages <= 1) return;

    if (window.innerWidth < MOBILE_BREAKPOINT) {
      renderMobilePagination(totalPages);
    } else {
      renderDesktopPagination(totalPages);
    }
  }

  function renderMobilePagination(totalPages) {
    const prev = createButton("←", currentPage === 1, () => {
      currentPage--;
      renderPage();
    },"Ga naar vorige pagina");

    const info = document.createElement("span");
    info.textContent = ` Page ${currentPage} of ${totalPages} `;

    const next = createButton("→", currentPage === totalPages, () => {
      currentPage++;
      renderPage();
    },"Ga naar volgende pagina");

    pagination.append(prev, info, next);
  }

  function renderDesktopPagination(totalPages) {
    const prev = createButton("←", currentPage === 1, () => {
      currentPage--;
      renderPage();
    });
    pagination.appendChild(prev);

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + MAX_VISIBLE_PAGES - 1);

    if (startPage > 1) {
      pagination.appendChild(createPageButton(1));
      if (startPage > 2) pagination.appendChild(createDots());
    }

    for (let i = startPage; i <= endPage; i++) {
      pagination.appendChild(createPageButton(i));
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pagination.appendChild(createDots());
      pagination.appendChild(createPageButton(totalPages));
    }

    const next = createButton("→", currentPage === totalPages, () => {
      currentPage++;
      renderPage();
    });
    pagination.appendChild(next);
  }

  function createButton(text, disabled, onClick) {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.disabled = disabled;
    if (!disabled) btn.addEventListener("click", onClick);
    return btn;
  }

  function createPageButton(page) {
    const btn = document.createElement("button");
    btn.textContent = page;
    if (page === currentPage) btn.classList.add("active");

    btn.addEventListener("click", () => {
      currentPage = page;
      renderPage();
    });

    return btn;
  }

  function createDots() {
    const span = document.createElement("span");
    span.textContent = " … ";
    return span;
  }

  // Debounced search
  if (searchInput) {
    searchInput.addEventListener("input", debounce(e => {
      searchTerm = e.target.value.trim();
      currentPage = 1;
      applyFilter();
      renderPage();
    }, DEBOUNCE_DELAY));
  }

  function debounce(func, delay) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  window.addEventListener("resize", renderPagination);
}
