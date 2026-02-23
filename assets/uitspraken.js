fetch('uitspraken.txt')
  .then(response => response.text())
  .then(text => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const today = new Date().toISOString().slice(0,10); // YYYY-MM-DD
    const storedDate = localStorage.getItem('lineDate');
    let selectedLine;
    if (storedDate === today) {
      selectedLine = localStorage.getItem('dailyLine');
    } else {
      const randomIndex = Math.floor(Math.random() * lines.length);
      selectedLine = lines[randomIndex];
      localStorage.setItem('dailyLine', selectedLine);
      localStorage.setItem('lineDate', today);
    }
    document.getElementById('uitspraak').textContent = selectedLine;
  })
  .catch(error => {
    document.getElementById('uitspraak').textContent = "Kan mijn uitspraak van de dag niet weergeven.";
    console.error(error);
  });
