const audio = document.querySelector("#audio");
const releaseList = document.querySelector("#release-list");
const tracks = musicLibrary.releases;
let selectedIndex = -1;

function selectTrack(index) {
  if (index === selectedIndex) return;
  selectedIndex = index;
  const track = tracks[index];
  audio.src = track.path;
  document.querySelector("#current-title").textContent = track.title;
  document.querySelector("#current-artist").textContent = track.artist;
  for (const card of releaseList.children) {
    if (card.dataset.track === track.id) card.setAttribute("aria-current", "true");
    else card.removeAttribute("aria-current");
  }
}

function makeCoverCard(track) {
  const card = document.createElement("article");
  card.className = "card";

  const image = document.createElement("img");
  image.src = track.image;
  image.alt = "";

  const title = document.createElement("span");
  title.className = "track-title";
  title.textContent = track.title;
  const availability = document.createElement("small");
  availability.textContent = "Artwork only";
  card.append(image, title, availability);
  return card;
}

for (const [id, tracks] of Object.entries(musicLibrary.collections)) {
  const shelf = document.getElementById(id);
  shelf.append(...tracks.map(makeCoverCard));
}

function makeRelease(track, index) {
  const button = document.createElement("button");
  button.className = "release";
  button.type = "button";
  button.dataset.track = track.id;
  button.setAttribute("aria-label", `Play ${track.title} by ${track.artist}`);

  const sleeve = document.createElement("span");
  sleeve.className = "sleeve";
  sleeve.setAttribute("aria-hidden", "true");
  const copy = document.createElement("span");
  copy.className = "release-copy";
  const title = document.createElement("strong");
  title.textContent = track.title;
  const artist = document.createElement("span");
  artist.textContent = `${track.artist} · ${track.genre}`;
  copy.append(title, artist);
  const action = document.createElement("span");
  action.className = "release-action";
  action.setAttribute("aria-hidden", "true");
  action.textContent = "▶";
  button.append(sleeve, copy, action);

  button.addEventListener("click", () => {
    selectTrack(index);
    audio.play();
  });
  return button;
}

releaseList.append(...tracks.map(makeRelease));
selectTrack(0);
