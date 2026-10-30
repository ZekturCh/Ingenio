const VERSION = "ca877c95f6cf047c8dc9";
const PREFIX = `samay-karaoke-${self.registration.scope}-`;
const CACHE = PREFIX + VERSION;
const manifestURL = new URL("offline-assets.json", self.registration.scope).href;
let job = null;
let lastStatus = null;
const mediaBlobs = new Map();
let assetIndex;

self.addEventListener("install", event => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));

async function broadcast(status) {
  status = { ...status, version: VERSION };
  lastStatus = status;
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of clients) client.postMessage({ type: "OFFLINE_STATUS", status });
}

async function getManifest() {
  const cache = await caches.open(CACHE);
  const stored = await cache.match(manifestURL);
  if (stored) return stored.json();
  const response = await fetch(manifestURL, { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudo descargar la lista de archivos.");
  const manifest = await response.clone().json();
  if (manifest.version !== VERSION) throw new Error("La página se está actualizando. Reintenta la descarga en un momento.");
  await cache.put(manifestURL, response);
  return manifest;
}

const assetURL = asset => new URL(asset.url, self.registration.scope).href;
function valid(response, asset) {
  return response?.status === 200 && response.headers.get("X-Karaoke-SHA256") === asset.sha256
    && Number(response.headers.get("Content-Length")) === asset.size;
}

async function inspect(manifest, cache) {
  const missing = [];
  let bytes = 0;
  for (const asset of manifest.assets) {
    if (valid(await cache.match(assetURL(asset)), asset)) bytes += asset.size;
    else missing.push(asset);
  }
  return { missing, bytes, done: manifest.assets.length - missing.length, total: manifest.assets.length, totalBytes: manifest.totalBytes };
}

async function check() {
  if (job && lastStatus) { await broadcast(lastStatus); return; }
  try {
    const manifest = await getManifest(), cache = await caches.open(CACHE);
    const { missing, ...status } = await inspect(manifest, cache);
    await broadcast({ ...status, state: missing.length ? "incomplete" : "ready", message: missing.length ? "La descarga está incompleta. Conéctate y pulsa Reintentar descarga." : undefined });
  } catch (error) { await broadcast({ state: "error", message: error.message }); }
}

async function download() {
  try {
    const manifest = await getManifest(), cache = await caches.open(CACHE);
    const { missing, ...status } = await inspect(manifest, cache);
    await broadcast({ ...status, state: missing.length ? "downloading" : "ready" });
    const oldCaches = (await caches.keys()).filter(key => key.startsWith(PREFIX) && key !== CACHE);
    let index = 0, failure = null;
    async function worker() {
      while (index < missing.length && !failure) {
        const asset = missing[index++], url = assetURL(asset);
        try {
          // Reuse unchanged files across app updates, especially the full MP3 files.
          let cached;
          for (const name of oldCaches) {
            const previous = await (await caches.open(name)).match(url);
            if (valid(previous, asset)) { cached = previous; break; }
          }
          if (cached) await cache.put(url, cached);
          else {
            const response = await fetch(url, { cache: "no-store" });
            if (response.status !== 200) throw new Error(`No se pudo descargar ${asset.url}.`);
            const body = await response.arrayBuffer();
            const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", body)), byte => byte.toString(16).padStart(2, "0")).join("");
            if (body.byteLength !== asset.size || hash !== asset.sha256) throw new Error(`El archivo ${asset.url} cambió o está incompleto. Reintenta en un momento.`);
            const headers = new Headers(response.headers);
            headers.delete("Content-Encoding"); headers.delete("Content-Range");
            headers.set("Content-Length", body.byteLength);
            headers.set("X-Karaoke-SHA256", hash);
            await cache.put(url, new Response(body, { status: 200, headers }));
          }
          status.done++; status.bytes += asset.size;
          await broadcast({ ...status, state: "downloading" });
        } catch (error) { failure = error; }
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    if (failure) throw failure;
    const verified = await inspect(manifest, cache);
    if (verified.missing.length) throw new Error("Faltan archivos. Reintenta la descarga para completarlos.");
    await broadcast({ ...status, state: "ready" });
    for (const name of oldCaches) await caches.delete(name);
  } catch (error) {
    await broadcast({ state: "error", message: `Descarga pendiente: ${error.message} Los archivos completos se conservan para continuar.` });
  }
}

self.addEventListener("message", event => {
  if (event.data?.type === "DOWNLOAD_OFFLINE") {
    if (!job) job = download().finally(() => { job = null; });
    event.waitUntil(job);
  } else if (event.data?.type === "CHECK_OFFLINE") event.waitUntil(check());
});

function canonical(request) {
  const url = new URL(request.url);
  url.search = "";
  url.hash = "";
  if (url.href === self.registration.scope) url.pathname += "index.html";
  return url.href;
}

async function fromCache(url) {
  const current = await (await caches.open(CACHE)).match(url);
  if (url === manifestURL) return current;
  if (!assetIndex) assetIndex = getManifest().then(manifest => new Map(manifest.assets.map(asset => [assetURL(asset), asset])))
    .catch(error => { assetIndex = null; throw error; });
  let expected;
  try { expected = (await assetIndex).get(url); } catch { return; }
  if (!expected) return;
  if (valid(current, expected)) return current;
  for (const name of (await caches.keys()).filter(key => key.startsWith(PREFIX) && key !== CACHE)) {
    const response = await (await caches.open(name)).match(url);
    // Never pair a new lyric clock with a cached recording from an older release.
    if (valid(response, expected)) return response;
  }
}

async function partial(response, range, url) {
  const size = Number(response.headers.get("Content-Length"));
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  // An unsupported multi-range header can be ignored with a full 200 response.
  if (!match) return response;
  let start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  let end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  if ((!match[1] && !match[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }
  const headers = new Headers(response.headers);
  headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  headers.set("Content-Length", end - start + 1);
  headers.set("Accept-Ranges", "bytes");
  let body = mediaBlobs.get(url);
  if (!body) {
    body = await response.blob();
    mediaBlobs.set(url,body);
    if (mediaBlobs.size > 2) mediaBlobs.delete(mediaBlobs.keys().next().value);
  } else { mediaBlobs.delete(url); mediaBlobs.set(url,body); }
  return new Response(body.slice(start, end + 1), { status: 206, headers });
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (!["GET", "HEAD"].includes(request.method) || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cached = await fromCache(canonical(request));
    if (!cached) return fetch(request, { cache: "no-store" });
    if (request.method === "HEAD") return new Response(null, { status: cached.status, headers: cached.headers });
    return request.headers.has("Range") ? partial(cached, request.headers.get("Range"), canonical(request)) : cached;
  })());
});
