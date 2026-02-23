function initPosts(section) {
  const POSTS_PER_PAGE = 5;
  let currentPage = 1;
  let allPosts = [];
  let masterPosts = [];

  fetch(`/${section}/posts.json`)
    .then(res => res.json())
    .then(data => {
      masterPosts = data.sort((a, b) => new Date(b.date) - new Date(a.date));
      allPosts = [...masterPosts];
      renderPage();
    });

  function renderPage() {
    const container = document.getElementById("posts");
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
    const pagination = document.getElementById("pagination");
    pagination.innerHTML = "";

    for (let i = 1; i <= totalPages; i++) {
      pagination.innerHTML += `
        <button onclick="goToPage(${i})">${i}</button>
      `;
    }
  }

  window.goToPage = function(page) {
    currentPage = page;
    renderPage();
  };

  const searchInput = document.getElementById("search");
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
