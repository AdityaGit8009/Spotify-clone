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
