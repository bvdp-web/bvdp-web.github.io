function initPosts(section) {
  const POSTS_PER_PAGE = 5;
  let currentPage = 1;
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
      renderPage();
    });

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

    renderPagination();
  }

  function renderPagination() {
    const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
    pagination.innerHTML = "";

    if (totalPages <= 1) return;

    // Previous button
    const prevBtn = document.createElement("button");
    prevBtn.textContent = "← Vorige";
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderPage();
      }
    });
    pagination.appendChild(prevBtn);

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;

      if (i === currentPage) {
        btn.classList.add("active");
      }

      btn.addEventListener("click", () => {
        currentPage = i;
        renderPage();
      });

      pagination.appendChild(btn);
    }

    // Next button
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Volgende →";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderPage();
      }
    });
    pagination.appendChild(nextBtn);
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
