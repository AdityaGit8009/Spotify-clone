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
