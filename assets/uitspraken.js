(() => {
  "use strict";
  // Stable hash: all visitors receive the same quotation
  // on the same local calendar day.
  function hashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }
  // Generate a local calendar date in YYYY-MM-DD format.
  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  // Determine the quotation for a specific date.
  function getQuoteForDate(dateKey, lines) {
    return lines[hashString(dateKey) % lines.length];
  }
  // Update the daily quotation.
  function updateQuote(lines) {
    if (!lines.length) return;
    const element = document.getElementById("uitspraak");
    if (!element) {
      console.error('QUOTE: Element "uitspraak" niet gevonden');
      return;
    }
    const today = localDateKey();
    const selectedLine = getQuoteForDate(today, lines);
    element.textContent = selectedLine;
    console.log("QUOTE: Dagelijkse uitspraak geladen");
  }
  // Schedule the next update at local midnight.
  function startDailyCheck(lines) {
    let midnightTimer;
    function refreshAndSchedule() {
      updateQuote(lines);
      clearTimeout(midnightTimer);
      const now = new Date();
      // Calculate the next local midnight.
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0, 0, 1
      );
      const delay = nextMidnight.getTime() - Date.now();
      midnightTimer = setTimeout(
        refreshAndSchedule,
        Math.max(1000, delay)
      );
    }
    // Initial update.
    refreshAndSchedule();
    // Recheck when the visitor returns to the page.
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        refreshAndSchedule();
      }
    });
  }
  // Load the quotations.
  fetch("uitspraken.txt")
    .then(response => {
      if (!response.ok) {
        throw new Error(`QUOTE: HTTP ${response.status}`);
      }
      return response.text();
    })
    .then(text => {
      const lines = text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
      if (!lines.length) {
        throw new Error("QUOTE: Geen uitspraken gevonden");
      }
      startDailyCheck(lines);
    })
    .catch(error => {
      const element = document.getElementById("uitspraak");
      if (element) {
        element.textContent = "Kan mijn uitspraak van de dag niet weergeven.";
      }
      console.error("QUOTE:", error);
    });
})();
