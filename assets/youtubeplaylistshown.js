// Youtube embeds on Homepage
document.querySelectorAll(".youtube .thumbnail").forEach(thumb => {
  thumb.addEventListener("click", () => {
    const card = thumb.closest(".card");
    const videoUrl = card.dataset.video;
    if (card.classList.contains("loaded")) return;
    const iframe = document.createElement("iframe");
    iframe.src = videoUrl + "&autoplay=1&shuffle=1&loop=1";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    iframe.style.width = "100%";
    iframe.style.aspectRatio = "16/9";
    iframe.style.borderRadius = "10px";
    iframe.style.border = "0";
    thumb.replaceWith(iframe);
    card.classList.add("loaded");
  });
});


// Which Youtube Playlist to show
function getEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}
function isBetween(date, start, end) {
  return date >= start && date <= end;
}
function showCard(id) {
  document.querySelectorAll(".youtube .card").forEach(card => {
    const cardId = card.dataset.id;
    // Always visible cards
    if (cardId === "always") {
      card.style.display = "";
      return;
    }
    // Seasonal slot
    if (id) {
      card.style.display = cardId === id ? "" : "none";
    } else {
      card.style.display = cardId === "default" ? "" : "none";
    }
  });
}

const today = new Date();
const year = today.getFullYear();
const easter = getEaster(year);
// Palm Sunday
const palmSunday = new Date(easter);
palmSunday.setDate(easter.getDate() - 7);
// Easter Week
const easterEnd = new Date(easter);
easterEnd.setDate(easter.getDate() + 7);
// Ascension Day
const ascension = new Date(easter);
ascension.setDate(easter.getDate() + 39);
// Day before Ascension
const beforeAscension = new Date(ascension);
beforeAscension.setDate(ascension.getDate() - 2);
// Ascension week
const ascensionEnd = new Date(ascension);
ascensionEnd.setDate(ascension.getDate() + 10);
// Pentecost
const pentecost = new Date(easter);
pentecost.setDate(easter.getDate() + 49);
// Pentecost week
const pentecostEnd = new Date(pentecost);
pentecostEnd.setDate(pentecost.getDate() + 7);

const month = today.getMonth();
const day = today.getDate();
// New Year: Dec 30 → Jan 7
if ((month === 11 && day >= 30) || (month === 0 && day <= 7)) {
  showCard("on");
}
// Christmas: Dec 1 → Dec 29
else if (month === 11 && day >= 1 && day <= 29) {
  showCard("kerst");
}
// Easter season
else if (isBetween(today, easter, easterEnd)) {
  showCard("pasen");
}
// Good Friday
else if (isBetween(today, palmSunday, easter)) {
  showCard("gv");
}
// Pentecost week
else if (isBetween(today, pentecost, pentecostEnd)) {
  showCard("pinkst");
}
// Ascension week
else if (isBetween(today, beforeAscension, ascensionEnd)) {
  showCard("hemelv");
}
else {
  showCard("default");
}
