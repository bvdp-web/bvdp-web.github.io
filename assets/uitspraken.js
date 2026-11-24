// Stable hash: all visitors receive the same quotation
// on the same calendar day in the configured timezone.
function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
// Determine the quotation for a specific date.
function getQuoteForDate(dateKey, lines) {
  return lines[hashString(dateKey) % lines.length];
}
// Local date function
function localDateKey() {
  return new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}
// Update the daily quotation.
function updateQuote(lines) {
  if (!lines.length) return;
  // Use the local calendar date.
  const today = localDateKey();
  const selectedLine = getQuoteForDate(today, lines);
  document.getElementById('uitspraak').textContent = selectedLine;
  console.log("QUOTE: Dagelijkse uitspraak geladen");
}
// Check periodically for a new calendar day.
function startHourlyCheck(lines) {
  updateQuote(lines);
  setInterval(() => {
    updateQuote(lines);
  }, 60 * 60 * 1000);
}
// Load the quotations.
fetch('uitspraken.txt')
  .then(r => {
    if (!r.ok) throw new Error(`QUOTE: HTTP ${r.status}`);
    return r.text();
  })
  .then(text => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    startHourlyCheck(lines);
  })
  .catch(error => {
    document.getElementById('uitspraak').textContent = "Kan mijn uitspraak van de dag niet weergeven.";
    console.error("QUOTE:", error);
  });
