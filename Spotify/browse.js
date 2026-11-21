const search = document.querySelector("#library-search");
const clearSearch = document.querySelector("#clear-search");
const searchStatus = document.querySelector("#search-status");
const sections = [...document.querySelectorAll("main > section")];

function words(value) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
}

const searchIndex = sections.map(section => ({
  section,
  items: [...section.querySelectorAll("[data-search]")].map(card => ({
    card,
    text: words(card.dataset.search).join(" "),
  })),
}));

function filterLibrary() {
  const terms = words(search.value);
  let resultCount = 0;
  for (const {section, items} of searchIndex) {
    let matches = 0;
    for (const {card, text} of items) {
      const match = terms.every(term => text.includes(term));
      card.hidden = !match;
      if (match) matches++;
    }
    section.hidden = matches === 0;
    shelfLinks.get(section.id).hidden = section.hidden;
    resultCount += matches;
  }
  scheduleLocationUpdate();
  clearSearch.hidden = !search.value;
  if (!search.value.trim()) searchStatus.textContent = "";
  else if (resultCount === 0) searchStatus.textContent = `No matches for “${search.value.trim()}”.`;
  else searchStatus.textContent = `${resultCount} matching ${resultCount === 1 ? "entry" : "entries"}`;
}

function resetSearch() {
  search.value = "";
  filterLibrary();
  search.focus();
}

search.form.addEventListener("submit", event => event.preventDefault());
search.addEventListener("input", filterLibrary);
search.addEventListener("keydown", event => {
  if (event.key === "Escape" && search.value) {
    event.preventDefault();
    resetSearch();
  }
});
clearSearch.addEventListener("click", resetSearch);

const preview = document.querySelector("#cover-preview");
const previewImage = document.querySelector("#preview-image");
let previewTrigger = null;

document.querySelector("#library").addEventListener("click", event => {
  const card = event.target.closest(".card");
  if (!card) return;
  previewTrigger = card;
  const title = card.querySelector(".track-title").textContent;
  document.querySelector("#preview-title").textContent = title;
  previewImage.src = card.querySelector("img").getAttribute("src");
  previewImage.alt = `Cover artwork for ${title}`;
  preview.showModal();
});
document.querySelector("#close-preview").addEventListener("click", () => preview.close());
preview.addEventListener("close", () => {
  previewImage.removeAttribute("src");
  previewTrigger?.focus({preventScroll: true});
  previewTrigger = null;
});
preview.addEventListener("click", event => {
  if (event.target !== preview) return;
  const bounds = preview.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom) preview.close();
});

const shelfLinks = new Map([...document.querySelectorAll(".sidebar nav a")].map(link => [
  link.hash.slice(1), link,
]));
let locationFrame;

function syncLocation() {
  locationFrame = null;
  const visible = sections.filter(section => !section.hidden);
  let current = visible[0];
  for (const section of visible) {
    if (section.getBoundingClientRect().top <= 32) current = section;
  }
  if (window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
    current = visible.at(-1);
  }
  for (const [id, link] of shelfLinks) {
    if (current?.id === id) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
}

function scheduleLocationUpdate() {
  if (locationFrame == null) locationFrame = requestAnimationFrame(syncLocation);
}

window.addEventListener("scroll", scheduleLocationUpdate, {passive: true});
window.addEventListener("resize", scheduleLocationUpdate);
filterLibrary();
