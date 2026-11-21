const audio = document.querySelector("#audio");

function makeCoverCard(track) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "card";

  const image = document.createElement("img");
  image.src = track.image;
  image.alt = "";

  const title = document.createElement("span");
  title.className = "track-title";
  title.textContent = track.title;
  card.append(image, title);

  card.addEventListener("click", () => {
    audio.src = track.path;
    audio.play();
  });
  return card;
}

for (const [id, tracks] of Object.entries(musicLibrary.collections)) {
  const shelf = document.getElementById(id);
  shelf.append(...tracks.map(makeCoverCard));
}
