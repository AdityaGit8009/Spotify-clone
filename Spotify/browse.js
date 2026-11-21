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
    resultCount += matches;
  }
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
