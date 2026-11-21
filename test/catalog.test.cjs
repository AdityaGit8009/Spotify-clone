const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const library = require("../Spotify/catalog.js");

const app = path.resolve(__dirname, "../Spotify");

function assertExactAsset(relative) {
  let directory = app;
  for (const segment of relative.split("/")) {
    assert.ok(fs.readdirSync(directory).includes(segment), `Incorrect asset path: ${relative}`);
    directory = path.join(directory, segment);
  }
  assert.ok(fs.statSync(directory).isFile(), relative);
}

test("every shelf cover uses its exact on-disk spelling", () => {
  for (const tracks of Object.values(library.collections)) {
    for (const track of tracks) assertExactAsset(track.image);
  }
});

test("artwork-only entries never advertise a playback source", () => {
  for (const track of Object.values(library.collections).flat()) {
    assert.equal(track.path, undefined, track.title);
  }
});

test("the playable library exactly matches the two bundled MP3s and their performers", () => {
  const files = fs.readdirSync(path.join(app, "song")).filter(name => name.endsWith(".mp3"));
  assert.deepEqual(library.releases.map(track => track.path).sort(), files.map(name => `song/${name}`).sort());
  assert.deepEqual(library.releases.map(({artist, title}) => [artist, title]), [
    ["Chime", "Win & Lose"],
    ["Hush", "Models"],
  ]);
  for (const track of library.releases) assertExactAsset(track.path);
});

test("the shelves expose every bundled cover and preserve the repeated original placement", () => {
  const tracks = Object.values(library.collections).flat();
  const images = fs.readdirSync(path.join(app, "images")).map(name => `images/${name}`).sort();
  assert.deepEqual([...new Set(tracks.map(track => track.image))].sort(), images);
  for (const shelf of ["discover-song", "popular-song"]) {
    assert.ok(library.collections[shelf].some(track => track.image === "images/mera naam tu.jpeg"));
  }
});
