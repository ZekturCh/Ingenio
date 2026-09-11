const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

const ADMIN_UID = "kXOgLCRPC0VhkqQltsgO1feNPLO2";
const db = admin.firestore();

async function assertAdmin(request) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Debes iniciar sesion.");
  if (uid === ADMIN_UID) return;

  const profile = await db.doc(`users/${uid}`).get();
  if (!profile.exists || profile.data().active !== true || profile.data().role !== "admin") {
    throw new HttpsError("permission-denied", "Solo admin puede gestionar cuentas.");
  }
}

exports.createAuthUser = onCall(async (request) => {
  await assertAdmin(request);

  const email = String(request.data?.email || "").trim();
  const password = String(request.data?.password || "");
  const displayName = String(request.data?.displayName || "").trim();
  const role = request.data?.role === "admin" ? "admin" : "staff";
  const active = request.data?.active !== false;

  if (!email || password.length < 6) {
    throw new HttpsError("invalid-argument", "Correo y contrasena de minimo 6 caracteres son requeridos.");
  }

  const user = await admin.auth().createUser({
    email,
    password,
    displayName: displayName || email,
    emailVerified: false,
    disabled: !active,
  });

  await db.doc(`users/${user.uid}`).set({
    displayName: displayName || email,
    email,
    role,
    active,
    createdAt: new Date().toISOString(),
    createdBy: request.auth.uid,
    updatedAt: new Date().toISOString(),
  });

  return { uid: user.uid };
});

exports.deleteAuthUser = onCall(async (request) => {
  await assertAdmin(request);

  const uid = String(request.data?.uid || "").trim();
  if (!uid) throw new HttpsError("invalid-argument", "UID requerido.");
  if (uid === ADMIN_UID) throw new HttpsError("failed-precondition", "No puedes eliminar el admin principal.");

  await admin.auth().deleteUser(uid);
  await db.doc(`users/${uid}`).delete();

  return { ok: true };
});
