import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDAYmwu9GD0R0BlL_6tUqOpUgByNci_Bhg",
  authDomain: "ingenioespectaculos.firebaseapp.com",
  projectId: "ingenioespectaculos",
  storageBucket: "ingenioespectaculos.firebasestorage.app",
  messagingSenderId: "185253280310",
  appId: "1:185253280310:web:fda7e38fb0688a09d43697",
};

const app = initializeApp(firebaseConfig, "samay-karaoke");
const db = getFirestore(app);

export const DEFAULT_ROOM = "HALLOWOW";
export const AUDIO_URL = "../cariñitobareto.mp3";

export const SONGS = [
  {
    id: "carinito",
    title: "Cariñito",
    artist: "Bareto",
    enabled: true,
    audio: AUDIO_URL,
    versions: [
      {
        id: "chorus",
        label: "Coro",
        durationLabel: "1:00",
        startAt: 57.214,
        endAt: 117.214,
        note: "Versión rápida para activación",
      },
      {
        id: "full",
        label: "Completa",
        durationLabel: "3:44",
        startAt: 0,
        endAt: 223.791,
        note: "Canción completa",
      },
    ],
  },
  { id: "odiame", title: "Ódiame", artist: "Eva Ayllón", enabled: false, versions: [] },
  { id: "himno-peru", title: "Himno Nacional del Perú", artist: "Perú", enabled: false, versions: [] },
  { id: "cuando-pienses", title: "Cuando pienses en volver", artist: "Pedro Suárez-Vértiz", enabled: false, versions: [] },
  { id: "ritmo-color-sabor", title: "Ritmo, color y sabor", artist: "Eva Ayllón", enabled: false, versions: [] },
];

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

  localStorage.setItem(localKey(roomId), JSON.stringify({ ...payload, updatedAtLocal: Date.now() }));
  window.dispatchEvent(new CustomEvent("samay-local-room", { detail: { roomId, payload } }));

  try {
    await setDoc(
      doc(db, "karaokeRooms", roomId),
      { ...payload, updatedAt: serverTimestamp() },
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

  try {
    const unsubscribe = onSnapshot(
      doc(db, "karaokeRooms", roomId),
      (snapshot) => {
        onStatus("online");
        if (snapshot.exists()) emit(snapshot.data(), "online");
      },
      (error) => {
        console.warn("Firebase listener unavailable; local fallback active.", error);
        onStatus("local");
        try {
          const cached = JSON.parse(localStorage.getItem(localKey(roomId)) || "null");
          if (cached) emit(cached, "initial");
        } catch {}
      }
    );

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

    try {
      const cached = JSON.parse(localStorage.getItem(localKey(roomId)) || "null");
      if (cached) emit(cached, "initial");
    } catch {}

    return () => {
      unsubscribe();
      window.removeEventListener("storage", storageHandler);
      window.removeEventListener("samay-local-room", customHandler);
    };
  } catch (error) {
    onStatus("local");
    return () => {};
  }
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
