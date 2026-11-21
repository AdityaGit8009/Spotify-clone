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
  await media.evaluate(element => element.pause());
  await page.waitForFunction(() => document.querySelector("#playback-status").textContent === "Paused");
  await media.evaluate(element => element.play());
  await waitForPlayback(page, "Win & Lose");
  await media.evaluate(element => { element.currentTime = element.duration - 0.15; });
  await waitForPlayback(page, "Models");
  await media.evaluate(element => { element.currentTime = element.duration - 0.15; });
  await page.waitForFunction(() => document.querySelector("#playback-status").textContent === "Finished");
  assert.equal(await page.locator("#current-title").textContent(), "Models");
  await page.getByRole("button", {name: "Play", exact: true}).click();
  await waitForPlayback(page, "Models");
  assert.ok(await media.evaluate(element => element.currentTime < 4));
});

test("seek and volume shortcuts follow the media while focused inputs keep their native keys", async t => {
  const page = await newPage(t);
  await page.goto(site.base + "Spotify/index.html");
  await page.waitForFunction(() => !document.querySelector("#seek").disabled);
  const media = page.locator("#audio");
  await page.locator(".release").first().focus();
  await page.keyboard.press("ArrowRight");
  assert.ok(await media.evaluate(element => element.currentTime >= 4.9 && element.currentTime <= 5.1));
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  assert.equal(await media.evaluate(element => element.currentTime), 0);
  const seek = page.getByRole("slider", {name: "Seek"});
  await seek.focus();
  await seek.press("ArrowRight");
  assert.ok(await media.evaluate(element => element.currentTime > 0 && element.currentTime < 1));

  const volume = page.getByRole("slider", {name: "Volume"});
  await volume.evaluate(element => {
    element.value = "42";
    element.dispatchEvent(new Event("input", {bubbles: true}));
  });
  await page.getByRole("button", {name: "Mute", exact: true}).click();
  assert.equal(await media.evaluate(element => element.muted), true);
  await page.keyboard.press("m");
  assert.deepEqual(await media.evaluate(element => [element.muted, element.volume]), [false, 0.42]);
  await volume.focus();
  await volume.press("Home");
  await page.getByRole("button", {name: "Unmute", exact: true}).click();
  assert.deepEqual(await media.evaluate(element => [element.muted, element.volume]), [false, 0.42]);

  await page.keyboard.press("/");
  const search = page.getByRole("searchbox");
  assert.equal(await search.evaluate(element => element === document.activeElement), true);
  await search.pressSequentially("m m");
  await search.press("ArrowLeft");
  assert.equal(await search.inputValue(), "m m");
  assert.deepEqual(await media.evaluate(element => [element.muted, element.paused]), [false, true]);
});

test("search filters matching shelves and previewing covers leaves the selected recording playing", async t => {
  const page = await newPage(t, {viewport: {width: 375, height: 780}});
  await page.goto(site.base + "Spotify/index.html");
  await page.getByRole("button", {name: "Play Models by Hush"}).click();
  await waitForPlayback(page, "Models");
  const search = page.getByRole("searchbox");
  await search.fill("CHÍME win");
  assert.equal(await page.locator(".release:visible").count(), 1);
  assert.equal(await page.locator(".card:visible").count(), 0);
  await search.fill("mere NAAM");
  assert.equal(await page.locator(".card:visible").count(), 2);
  assert.equal(await page.locator(".sidebar nav a:visible").count(), 2);
  const card = page.locator(".card:visible").first();
  await card.focus();
  await card.press("Enter");
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await dialog.locator("img").evaluate(image => image.decode());
  assert.match(await dialog.textContent(), /Audio is unavailable/);
  await page.keyboard.press("Escape");
  await dialog.waitFor({state: "hidden"});
  assert.equal(await card.evaluate(element => element === document.activeElement), true);
  await waitForPlayback(page, "Models");

  await search.fill("no matching record");
  assert.match(await page.locator("#search-status").textContent(), /No matches/);
  assert.equal(await page.locator(".sidebar nav a:visible").count(), 0);
  await search.press("Escape");
  assert.equal(await page.locator(".card:visible").count(), 22);
  assert.equal(await page.locator(".release:visible").count(), 2);
});

test("a failed recording can be retried on the same selection", async t => {
  const page = await newPage(t);
  await page.route("**/song/**", route => route.fulfill({status: 404, body: ""}));
  await page.goto(site.base + "Spotify/index.html");
  await page.waitForFunction(() => document.querySelector("#playback-status").textContent.includes("retry"));
  await page.unroute("**/song/**");
  await page.getByRole("button", {name: "Play", exact: true}).click();
  await waitForPlayback(page, "Win & Lose");
  assert.equal(await page.locator("#playback-status").textContent(), "Playing");
});

test("a delayed rejection from an old track cannot overwrite the current playing status", async t => {
  const page = await newPage(t);
  await page.addInitScript(() => {
    const nativePlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      HTMLMediaElement.prototype.play = nativePlay;
      return new Promise((resolve, reject) => {
        window.rejectOldRequest = () => reject(new DOMException("Old request", "NotAllowedError"));
      });
    };
  });
  await page.goto(site.base + "Spotify/index.html");
  await page.getByRole("button", {name: "Play Win & Lose by Chime"}).click();
  await page.getByRole("button", {name: "Play Models by Hush"}).click();
  await waitForPlayback(page, "Models");
  await page.evaluate(() => window.rejectOldRequest());
  assert.equal(await page.locator("#playback-status").textContent(), "Playing");
  assert.equal(await page.locator("#toggle-play").getAttribute("aria-label"), "Pause");
});
