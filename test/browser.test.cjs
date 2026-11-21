const assert = require("node:assert/strict");
const test = require("node:test");
const {chromium} = require("playwright-core");
const {serveLibrary} = require("./support/site.cjs");

let site;
let browser;

test.before(async () => {
  site = await serveLibrary();
  const options = process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {channel: "chrome"};
  browser = await chromium.launch({...options, headless: true});
});

test.after(async () => {
  try {
    await browser?.close();
  } finally {
    await site?.close();
  }
});

async function newPage(t, options = {}) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors = [];
  const unexpectedOrigins = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => {
    if (new URL(request.url()).origin !== new URL(site.base).origin) unexpectedOrigins.push(request.url());
  });
  t.after(async () => {
    await context.close();
    assert.deepEqual(errors, []);
    assert.deepEqual(unexpectedOrigins, []);
  });
  return page;
}

test("root launch preserves query and shelf fragment under a project subdirectory", async t => {
  const page = await newPage(t);
  await page.goto(site.base + "?from=library#indias-best-song");
  await page.waitForURL(site.base + "Spotify/index.html?from=library#indias-best-song");
  await page.locator("#indias-best-song .card").first().waitFor();
  assert.equal(await page.locator(".release").count(), 2);
  assert.equal(await page.locator(".card").count(), 22);
});

test("the original player URL loads every visible and deferred cover", async t => {
  const page = await newPage(t);
  await page.goto(site.base + "Spotify/index.html");
  for (const image of await page.locator(".card img").all()) {
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(element => element.decode());
    assert.ok(await image.evaluate(element => element.naturalWidth > 0));
  }
});

async function waitForPlayback(page, title) {
  await page.waitForFunction(expected => {
    const media = document.querySelector("#audio");
    return document.querySelector("#current-title").textContent === expected &&
      !media.paused && media.currentTime > 0 && Number.isFinite(media.duration);
  }, title);
}

test("both original MP3s decode and manual navigation preserves a paused player", async t => {
  const page = await newPage(t);
  await page.goto(site.base + "Spotify/index.html");
  for (const [title, artist] of [["Win & Lose", "Chime"], ["Models", "Hush"]]) {
    await page.getByRole("button", {name: `Play ${title} by ${artist}`}).click();
    await waitForPlayback(page, title);
    const source = await page.locator("#audio").evaluate(media => decodeURIComponent(new URL(media.currentSrc).pathname));
    assert.ok(source.includes(`/song/${artist} - ${title}  `), source);
    assert.equal(await page.locator(".release[aria-current=true] strong").textContent(), title);
    await page.getByRole("button", {name: `Pause ${title} by ${artist}`}).click();
    await page.waitForFunction(() => document.querySelector("#playback-status").textContent === "Paused");
  }
  await page.getByRole("button", {name: "Next track"}).click();
  assert.equal(await page.locator("#current-title").textContent(), "Win & Lose");
  assert.equal(await page.locator("#audio").evaluate(media => media.paused), true);
  await page.getByRole("button", {name: "Previous track"}).click();
  assert.equal(await page.locator("#current-title").textContent(), "Models");
});

test("natural completion advances once and leaves the final track ready to replay", async t => {
  const page = await newPage(t);
  await page.goto(site.base + "Spotify/index.html");
  await page.getByRole("button", {name: "Play", exact: true}).click();
  await waitForPlayback(page, "Win & Lose");
  const media = page.locator("#audio");
  await media.evaluate(element => { element.currentTime = element.duration - 0.15; });
  await waitForPlayback(page, "Models");
  await media.evaluate(element => { element.currentTime = element.duration - 0.15; });
  await page.waitForFunction(() => document.querySelector("#playback-status").textContent === "Finished");
  assert.equal(await page.locator("#current-title").textContent(), "Models");
  await page.getByRole("button", {name: "Play", exact: true}).click();
  await waitForPlayback(page, "Models");
  assert.ok(await media.evaluate(element => element.currentTime < 4));
});
