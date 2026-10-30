import { SONGS } from "./songs/catalog.js?v=20261030-3";
export { SONGS };

const firebaseConfig = {
  apiKey: "AIzaSyDAYmwu9GD0R0BlL_6tUqOpUgByNci_Bhg",
  authDomain: "ingenioespectaculos.firebaseapp.com",
  projectId: "ingenioespectaculos",
  storageBucket: "ingenioespectaculos.firebasestorage.app",
  messagingSenderId: "185253280310",
  appId: "1:185253280310:web:fda7e38fb0688a09d43697",
};

// Cloud sync is optional. Local playback and room controls never depend on a CDN.
let cloudPromise;
async function getCloud() {
  if (!navigator.onLine) return null;
  if (!cloudPromise) cloudPromise = (async () => {
    const [{ initializeApp }, api] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js"),
    ]);
    return { ...api, db: api.getFirestore(initializeApp(firebaseConfig, "samay-karaoke")) };
  })().catch(() => { cloudPromise = null; return null; });
  return cloudPromise;
}

export const DEFAULT_ROOM = "HALLOWOW";
export const AUDIO_URL = "songs/carinito/audio.mp3";

export function getSong(songId) {
  return SONGS.find((song) => song.id === songId) || null;
}

export function getVersion(song, versionId) {
  return song?.versions?.find((version) => version.id === versionId) || null;
}

export function normalizeRoom(raw) {
  const cleaned = String(raw || DEFAULT_ROOM)
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 32);
  return cleaned.length >= 4 ? cleaned : DEFAULT_ROOM;
}

export function roomFromUrl() {
  return normalizeRoom(new URLSearchParams(location.search).get("room"));
}

const localKey = (room) => `samay-karaoke-room-${normalizeRoom(room)}`;

export async function sendCommand(room, patch) {
  const roomId = normalizeRoom(room);
  const payload = {
    songId: patch.songId || "carinito",
    versionId: patch.versionId || "chorus",
    command: patch.command || "load",
    nonce: Date.now(),
    startAt: Number(patch.startAt ?? 55),
    endAt: Number(patch.endAt ?? 115),
  };

  try { localStorage.setItem(localKey(roomId), JSON.stringify({ ...payload, updatedAtLocal: Date.now() })); } catch {}
  window.dispatchEvent(new CustomEvent("samay-local-room", { detail: { roomId, payload } }));

  try {
    const cloud = await getCloud();
    if (!cloud) return { mode: "local", payload };
    await cloud.setDoc(
      cloud.doc(cloud.db, "karaokeRooms", roomId),
      { ...payload, updatedAt: cloud.serverTimestamp() },
      { merge: false }
    );
    return { mode: "online", payload };
  } catch (error) {
    console.warn("Firebase sync unavailable; using local fallback.", error);
    return { mode: "local", payload, error };
  }
}

export function subscribeRoom(room, callback, onStatus = () => {}) {
  const roomId = normalizeRoom(room);
  let lastNonce = null;

  const emit = (data, mode) => {
    if (!data || data.nonce == null) return;
    if (data.nonce === lastNonce && mode !== "initial") return;
    lastNonce = data.nonce;
    callback(data, mode);
  };

  let closed = false, unsubscribe = () => {}, connecting = false;
  const restoreLocal = () => {
    try {
      const cached = JSON.parse(localStorage.getItem(localKey(roomId)) || "null");
      if (cached) emit(cached, "initial");
    } catch {}
  };
  async function connect() {
    if (closed || connecting || !navigator.onLine) return;
    connecting = true;
    const cloud = await getCloud();
    connecting = false;
    if (!cloud || closed) return;
    unsubscribe();
    try { unsubscribe = cloud.onSnapshot(
      cloud.doc(cloud.db, "karaokeRooms", roomId),
      (snapshot) => {
        onStatus("online");
        if (snapshot.exists()) emit(snapshot.data(), "online");
      },
      (error) => {
        console.warn("Firebase listener unavailable; local fallback active.", error);
        onStatus("local");
        restoreLocal();
      }
    ); } catch { onStatus("local"); }
  }
  const storageHandler = (event) => {
    if (event.key !== localKey(roomId) || !event.newValue) return;
    try {
      emit(JSON.parse(event.newValue), "local");
    } catch {}
  };
  const customHandler = (event) => {
    if (event.detail?.roomId === roomId) emit(event.detail.payload, "local");
  };
  window.addEventListener("storage", storageHandler);
  window.addEventListener("samay-local-room", customHandler);

  const offline = () => { unsubscribe(); onStatus("local"); };
  window.addEventListener("online", connect);
  window.addEventListener("offline", offline);
  onStatus("local");
  restoreLocal();
  connect().catch(() => onStatus("local"));
  return () => {
    closed = true;
    unsubscribe();
    window.removeEventListener("storage", storageHandler);
    window.removeEventListener("samay-local-room", customHandler);
    window.removeEventListener("online", connect);
    window.removeEventListener("offline", offline);
  };
}

export function controllerUrl(room = DEFAULT_ROOM) {
  return new URL(`./?room=${encodeURIComponent(normalizeRoom(room))}`, location.href).href;
}

export function playerUrl(room = DEFAULT_ROOM) {
  return new URL(`./player.html?room=${encodeURIComponent(normalizeRoom(room))}`, location.href).href;
}

export function adminUrl(room = DEFAULT_ROOM) {
  return new URL(`./admin.html?room=${encodeURIComponent(normalizeRoom(room))}`, location.href).href;
}
