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
