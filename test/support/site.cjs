const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const {once} = require("node:events");

const root = path.resolve(__dirname, "../..");
const types = {".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".svg": "image/svg+xml", ".jpeg": "image/jpeg", ".mp3": "audio/mpeg"};

function collectAssets(directory, prefix, assets) {
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const key = prefix + entry.name;
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) collectAssets(filename, key + "/", assets);
    else assets.set(key, filename);
  }
}

async function serveLibrary() {
  const assets = new Map([["index.html", path.join(root, "index.html")]]);
  collectAssets(path.join(root, "Spotify"), "Spotify/", assets);
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://localhost");
    const mount = "/music/";
    const key = decodeURIComponent(url.pathname.slice(mount.length));
    const filename = url.pathname.startsWith(mount) && assets.get(key || "index.html");
    if (!filename) {
      response.writeHead(404).end();
      return;
    }

    const size = fs.statSync(filename).size;
    const headers = {"Content-Type": types[path.extname(filename)], "Accept-Ranges": "bytes"};
    let start = 0;
    let end = size - 1;
    const range = request.headers.range;
    if (range) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(range);
      if (match) {
        start = Number(match[1]);
        if (match[2]) end = Math.min(end, Number(match[2]));
      }
      if (!match || start > end) {
        response.writeHead(416, {"Content-Range": `bytes */${size}`}).end();
        return;
      }
      headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
    }
    headers["Content-Length"] = end - start + 1;
    response.writeHead(range ? 206 : 200, headers);
    const stream = fs.createReadStream(filename, {start, end});
    stream.on("error", () => response.destroy());
    response.on("close", () => stream.destroy());
    stream.pipe(response);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return {
    base: `http://127.0.0.1:${server.address().port}/music/`,
    close: () => new Promise(resolve => {
      server.close(resolve);
      server.closeAllConnections();
    }),
  };
}

module.exports = {serveLibrary};
