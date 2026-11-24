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
  // Generate the Dutch calendar date in YYYY-MM-DD format.
  function localDateKey(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Amsterdam",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);
    const values = Object.fromEntries(
      parts.map(part => [part.type, part.value])
    );
    return `${values.year}-${values.month}-${values.day}`;
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
  // Calculate the next midnight in Europe/Amsterdam.
  function getNextAmsterdamMidnight() {
    const dateKey = localDateKey(now);
    const [year, month, day] = dateKey.split("-").map(Number);
    const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
    const target = Date.UTC(
      nextDate.getUTCFullYear(),
      nextDate.getUTCMonth(),
      nextDate.getUTCDate()
    );
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Amsterdam",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    });
    let timestamp = target;
    // Resolve the Amsterdam UTC offset, including DST.
    for (let i = 0; i < 3; i++) {
      const parts = Object.fromEntries(
        formatter.formatToParts(new Date(timestamp))
          .map(part => [part.type, part.value])
      );
      const localAsUTC = Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
        Number(parts.second)
      );
      const offset = localAsUTC - timestamp;
      timestamp = target - offset;
    }
    return new Date(timestamp);
  }
  // Schedule the next update at Amsterdam midnight.
  function startDailyCheck(lines) {
    let midnightTimer;
    function refreshAndSchedule() {
      clearTimeout(midnightTimer);
      // Update the passage.
      updateQuote(lines);
      const now = new Date();
      // Calculate the next Amsterdam midnight.
      const nextMidnight = getNextAmsterdamMidnight();
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
