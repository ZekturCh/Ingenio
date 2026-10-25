let registration;
let latest = { state: "checking", done: 0, total: 0, bytes: 0, totalBytes: 0 };
const listeners = new Set();

function emit(status) {
  latest = status;
  for (const listener of listeners) listener(status);
}

export function onOfflineStatus(listener) {
  listeners.add(listener);
  listener(latest);
  return () => listeners.delete(listener);
}

export function downloadOffline() {
  const worker = registration?.active;
  if (worker) worker.postMessage({ type: "DOWNLOAD_OFFLINE" });
}

async function start() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    emit({ state: "error", message: "La descarga sin conexión necesita abrir la página mediante HTTPS o localhost." });
    return;
  }
  navigator.serviceWorker.addEventListener("message", event => {
    if (event.data?.type === "OFFLINE_STATUS") emit(event.data.status);
  });
  navigator.serviceWorker.addEventListener("controllerchange", downloadOffline);
  window.addEventListener("online", downloadOffline);
  window.addEventListener("pageshow", () => registration?.active?.postMessage({ type: "CHECK_OFFLINE" }));
  try {
    registration = await navigator.serviceWorker.register(new URL("./sw.js", import.meta.url), {
      scope: new URL("./", import.meta.url).pathname, updateViaCache: "none",
    });
    await navigator.serviceWorker.ready;
    downloadOffline();
  } catch {
    emit({ state: "error", message: "No se pudo preparar la descarga sin conexión. Vuelve a abrir la página con internet." });
  }
}

start();
