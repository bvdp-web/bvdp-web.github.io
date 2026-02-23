function initPosts(section) {
  const POSTS_PER_PAGE = 5;
  const MAX_VISIBLE_PAGES = 5;

  let currentPage = getPageFromURL();
  let allPosts = [];
  let masterPosts = [];

  const container = document.getElementById("posts");
  const pagination = document.getElementById("pagination");
  const searchInput = document.getElementById("search");

  fetch(`/${section}/posts.json`)
    .then(res => res.json())
    .then(data => {
      masterPosts = data.sort((a, b) => new Date(b.date) - new Date(a.date));
      allPosts = [...masterPosts];

      const totalPages = getTotalPages();
      if (currentPage > totalPages) currentPage = 1;

      renderPage();
    });

  function getTotalPages() {
    return Math.ceil(allPosts.length / POSTS_PER_PAGE);
  }

  function getPageFromURL() {
    const params = new URLSearchParams(window.location.search);
    return parseInt(params.get("page")) || 1;
  }

  function updateURL() {
    const url = new URL(window.location);
    url.searchParams.set("page", currentPage);
    window.history.replaceState({}, "", url);
  }

  function renderPage() {
    container.innerHTML = "";

    const start = (currentPage - 1) * POSTS_PER_PAGE;
    const end = start + POSTS_PER_PAGE;
    const pagePosts = allPosts.slice(start, end);

    pagePosts.forEach(post => {
      const postDate = post.date || "Geen datum beschikbaar";

      container.innerHTML += `
        <div class="card">
          <h2>${post.title}</h2>
          <small>${postDate}</small>
          <p>${post.description}</p>
          <a href="/${section}/post.html?post=${post.file}" class="button">Lezen</a>
        </div>
      `;
    });

    updateURL();
    renderPagination();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderPagination() {
    const totalPages = getTotalPages();
    pagination.innerHTML = "";

    if (totalPages <= 1) return;

    // Previous button
    const prevBtn = createButton("←", currentPage === 1, () => {
      currentPage--;
      renderPage();
    });
    pagination.appendChild(prevBtn);

    let startPage = Math.max(1, currentPage - Math.floor(MAX_VISIBLE_PAGES / 2));
    let endPage = startPage + MAX_VISIBLE_PAGES - 1;

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - MAX_VISIBLE_PAGES + 1);
    }

    // First page + dots
    if (startPage > 1) {
      pagination.appendChild(createPageButton(1));
      if (startPage > 2) {
        pagination.appendChild(createDots());
      }
    }

    // Visible range
    for (let i = startPage; i <= endPage; i++) {
      pagination.appendChild(createPageButton(i));
    }

    // Last page + dots
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pagination.appendChild(createDots());
      }
      pagination.appendChild(createPageButton(totalPages));
    }

    // Next button
    const nextBtn = createButton("→", currentPage === totalPages, () => {
      currentPage++;
      renderPage();
    });
    pagination.appendChild(nextBtn);
  }

  function createButton(text, disabled, onClick) {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.disabled = disabled;
    if (!disabled) btn.addEventListener("click", onClick);
    return btn;
  }

  function createPageButton(pageNumber) {
    const btn = document.createElement("button");
    btn.textContent = pageNumber;

    if (pageNumber === currentPage) {
      btn.classList.add("active");
    }

    btn.addEventListener("click", () => {
      currentPage = pageNumber;
      renderPage();
    });

    return btn;
  }

  function createDots() {
    const span = document.createElement("span");
    span.textContent = " … ";
    span.classList.add("dots");
    return span;
  }

  if (searchInput) {
    searchInput.addEventListener("input", e => {
      const term = e.target.value.toLowerCase();

      allPosts = masterPosts.filter(post =>
        post.title.toLowerCase().includes(term) ||
        post.description.toLowerCase().includes(term)
      );

      currentPage = 1;
      renderPage();
    });
  }
}
