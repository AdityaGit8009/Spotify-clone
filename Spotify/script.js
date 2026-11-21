const audio = document.querySelector("#audio");
const releaseList = document.querySelector("#release-list");
const tracks = musicLibrary.releases;
const playButton = document.querySelector("#toggle-play");
const playbackStatus = document.querySelector("#playback-status");
let selectedIndex = -1;
let playRevision = 0;
let playbackMessage = "";
let buffering = false;
let wantsPlayback = false;

function selectTrack(index) {
  if (index === selectedIndex) return;
  playRevision++;
  playbackMessage = "";
  buffering = false;
  wantsPlayback = false;
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

function isPlaying() {
  return !audio.paused && !audio.ended && !audio.error;
}

function syncPlayback() {
  const playing = isPlaying();
  const verb = playing ? "Pause" : "Play";
  let description = "Ready";
  if (playing) description = buffering ? "Loading" : "Playing";
  else if (audio.ended) description = "Finished";
  else if (audio.currentTime > 0) description = "Paused";
  const message = playbackMessage || description;
  if (playbackStatus.textContent !== message) playbackStatus.textContent = message;
  playButton.textContent = playing ? "Ⅱ" : "▶";
  playButton.setAttribute("aria-label", verb);
  for (const [index, card] of Array.from(releaseList.children).entries()) {
    const active = index === selectedIndex && playing;
    const track = tracks[index];
    card.setAttribute("aria-label", `${active ? "Pause" : "Play"} ${track.title} by ${track.artist}`);
    card.querySelector(".release-action").textContent = active ? "Ⅱ" : "▶";
  }
}

function startPlayback() {
  const revision = ++playRevision;
  wantsPlayback = true;
  playbackMessage = "";
  if (audio.error) audio.load();
  audio.play().catch(error => {
    if (revision !== playRevision) return;
    wantsPlayback = false;
    buffering = false;
    if (error.name !== "AbortError") {
      playbackMessage = error.name === "NotAllowedError" ? "Press play to start" : "Audio unavailable. Press play to retry.";
    }
    syncPlayback();
  });
}

function togglePlayback() {
  if (wantsPlayback || isPlaying()) {
    playRevision++;
    wantsPlayback = false;
    audio.pause();
  } else {
    if (audio.ended) audio.currentTime = 0;
    startPlayback();
  }
}

function moveTrack(direction) {
  const playing = wantsPlayback || isPlaying();
  selectTrack((selectedIndex + direction + tracks.length) % tracks.length);
  if (playing) startPlayback();
  syncPlayback();
}

function makeCoverCard(track) {
  const card = document.createElement("button");
  card.type = "button";
  card.setAttribute("aria-label", `View artwork for ${track.title}. Audio unavailable.`);
  card.setAttribute("aria-haspopup", "dialog");
  card.className = "card";
  card.dataset.search = track.title;

  const image = document.createElement("img");
  image.loading = "lazy";
  image.decoding = "async";
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
  const shelf = document.getElementById(id).querySelector(".cardwrapper");
  shelf.append(...tracks.map(makeCoverCard));
}

function makeRelease(track, index) {
  const button = document.createElement("button");
  button.className = "release";
  button.type = "button";
  button.dataset.track = track.id;
  button.dataset.search = `${track.title} ${track.artist} ${track.genre}`;
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
    if (selectedIndex === index) togglePlayback();
    else {
      selectTrack(index);
      startPlayback();
    }
  });
  return button;
}

releaseList.append(...tracks.map(makeRelease));
selectTrack(0);

playButton.addEventListener("click", togglePlayback);
document.querySelector("#previous").addEventListener("click", () => moveTrack(-1));
document.querySelector("#next").addEventListener("click", () => moveTrack(1));
audio.addEventListener("emptied", syncPlayback);
audio.addEventListener("play", () => {
  if (isPlaying()) {
    wantsPlayback = true;
    playbackMessage = "";
  }
  syncPlayback();
});
audio.addEventListener("ended", () => {
  if (!audio.ended) return;
  if (wantsPlayback && selectedIndex < tracks.length - 1) {
    selectTrack(selectedIndex + 1);
    startPlayback();
  } else {
    wantsPlayback = false;
    syncPlayback();
  }
});
audio.addEventListener("waiting", () => { buffering = true; syncPlayback(); });
audio.addEventListener("playing", () => { buffering = false; syncPlayback(); });
audio.addEventListener("pause", () => {
  if (audio.paused && !audio.ended) wantsPlayback = false;
  syncPlayback();
});
audio.addEventListener("error", () => {
  if (!audio.error) return;
  wantsPlayback = false;
  buffering = false;
  playbackMessage = "Audio unavailable. Press play to retry.";
  syncPlayback();
});
audio.controls = false;
document.querySelector(".transport").hidden = false;
syncPlayback();

document.body.classList.remove("static-mode");
