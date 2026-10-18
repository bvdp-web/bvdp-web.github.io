function updateQuote(lines) {
  const today = new Date().toISOString().slice(0,10);
  const storedDate = localStorage.getItem('lineDate');
  let selectedLine;
  if (storedDate === today) {
    selectedLine = localStorage.getItem('dailyLine');
    console.log("QUOTE: Uitspraak uit de cache geladen");
  } else {
    const randomIndex = Math.floor(Math.random() * lines.length);
    selectedLine = lines[randomIndex];
    localStorage.setItem('dailyLine', selectedLine);
    localStorage.setItem('lineDate', today);
    console.log("QUOTE: Uitspraak willekeurig gekozen voor vandaag")
  }
  document.getElementById('uitspraak').textContent = selectedLine;
}

function startHourlyCheck(lines) {
  updateQuote(lines);
  setInterval(() => {
    updateQuote(lines);
  }, 60 * 60 * 1000);
}

fetch('uitspraken.txt')
  .then(r => r.text())
  .then(text => {
    const lines = text.split('\n').filter(l => l.trim());
    startHourlyCheck(lines);
  })
  .catch(error => {
    document.getElementById('uitspraak').textContent = "Kan mijn uitspraak van de dag niet weergeven.";
    console.error("QUOTE:", error);
  });
