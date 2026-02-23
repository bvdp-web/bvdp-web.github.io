const backButton = document.getElementById("backButton");
if (backButton) {
  backButton.addEventListener("click", e => {
    e.preventDefault();

    // Check if the referrer contains either artikelen or preken
    if (document.referrer) {
      const ref = document.referrer.toLowerCase();

      if (ref.includes("/artikelen/") || ref.includes("/preken/")) {
        // Go back to previous page in history
        history.back();
        return;
      }
    }

    // Fallback: go to main page based on current URL
    const currentPath = window.location.pathname.toLowerCase();

    if (currentPath.includes("/artikelen/")) {
      window.location.href = "/artikelen/";
    } else if (currentPath.includes("/preken/")) {
      window.location.href = "/preken/";
    } else {
      // default fallback
      window.location.href = "/";
    }
  });
}
