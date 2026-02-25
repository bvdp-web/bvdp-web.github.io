function loadPartial(id, file) {
  fetch(file)
    .then(response => {
      if (!response.ok) throw new Error("Network error");
      return response.text();
    })
    .then(data => {
      document.getElementById(id).innerHTML = data;
    })
    .catch(error => console.error("Error loading", file, error));
}

document.addEventListener("DOMContentLoaded", function() {
  loadPartial("navbar", "/navfooter/navbar.html");
  loadPartial("footer", "/navfooter/footer.html");
});
