const seek = document.querySelector("#seek");
const elapsed = document.querySelector("#elapsed");
const duration = document.querySelector("#duration");

function clockTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "--:--";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function seekTo(seconds) {
  if (!Number.isFinite(audio.duration) || audio.duration <= 0 || !Number.isFinite(seconds)) return;
  audio.currentTime = Math.max(0, Math.min(seconds, audio.duration));
  syncTimeline();
}

function syncTimeline() {
  const available = Number.isFinite(audio.duration) && audio.duration > 0;
  seek.disabled = !available;
  seek.max = available ? String(audio.duration) : "0";
  seek.value = available ? String(audio.currentTime) : "0";
  elapsed.textContent = clockTime(available ? audio.currentTime : 0);
  duration.textContent = clockTime(audio.duration);
  seek.setAttribute("aria-valuetext", `${elapsed.textContent} of ${duration.textContent}`);
}

for (const event of ["loadedmetadata", "durationchange", "timeupdate", "emptied", "seeked"]) {
  audio.addEventListener(event, syncTimeline);
}
seek.addEventListener("input", () => seekTo(Number(seek.value)));
document.querySelector(".timeline").hidden = false;
syncTimeline();
