const audio = document.querySelector("#audio");

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

function makeRelease(track) {
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
    audio.src = track.path;
    audio.play();
  });
  return button;
}

document.querySelector("#release-list").append(...musicLibrary.releases.map(makeRelease));
