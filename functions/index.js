const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const cloudinary = require("cloudinary").v2;

admin.initializeApp();

const ADMIN_UID = "kXOgLCRPC0VhkqQltsgO1feNPLO2";
const db = admin.firestore();
const cloudinaryApiKey = defineSecret("CLOUDINARY_API_KEY");
const cloudinaryApiSecret = defineSecret("CLOUDINARY_API_SECRET");

async function assertAdmin(request) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Debes iniciar sesion.");
  if (uid === ADMIN_UID) return;

  const profile = await db.doc(`users/${uid}`).get();
  if (!profile.exists || profile.data().active !== true || profile.data().role !== "admin") {
    throw new HttpsError("permission-denied", "Solo admin puede gestionar cuentas.");
  }
}

async function assertOrderManager(request) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Debes iniciar sesion.");
  if (uid === ADMIN_UID) return;

  const profile = await db.doc(`users/${uid}`).get();
  const role = profile.exists ? profile.data().role : null;
  if (!profile.exists || profile.data().active !== true || !["admin", "supervisor"].includes(role)) {
    throw new HttpsError("permission-denied", "Solo supervisor o admin puede limpiar fotos de un retorno.");
  }
}

function configureCloudinary() {
  cloudinary.config({
    cloud_name: "dsnptnqil",
    api_key: cloudinaryApiKey.value(),
    api_secret: cloudinaryApiSecret.value(),
    secure: true,
  });
}

exports.createAuthUser = onCall(async (request) => {
  await assertAdmin(request);

  const email = String(request.data?.email || "").trim();
  const password = String(request.data?.password || "");
  const displayName = String(request.data?.displayName || "").trim();
  const requestedRole = String(request.data?.role || "staff");
  const role = requestedRole === "supervisor" ? "supervisor" : "staff";
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

exports.deleteOrderPhotos = onCall(
  { secrets: [cloudinaryApiKey, cloudinaryApiSecret] },
  async (request) => {
    await assertOrderManager(request);

    const orderId = String(request.data?.orderId || "").trim();
    if (!orderId) throw new HttpsError("invalid-argument", "ID de salida requerido.");

    const orderRef = db.doc(`orders/${orderId}`);
    const order = await orderRef.get();
    if (!order.exists || order.data().status !== "Devuelto") {
      throw new HttpsError("failed-precondition", "Solo se pueden limpiar fotos de una salida devuelta.");
    }

    configureCloudinary();
    const attachments = await orderRef.collection("attachments").get();
    let deleted = 0;
    let retained = 0;

    for (const attachment of attachments.docs) {
      const publicId = String(attachment.data().publicId || "").trim();
      try {
        if (publicId) {
          const result = await cloudinary.uploader.destroy(publicId, {
            invalidate: true,
            resource_type: "image",
          });
          if (!["ok", "not found"].includes(result.result)) {
            retained += 1;
            continue;
          }
        }
        await attachment.ref.delete();
        deleted += 1;
      } catch (error) {
        console.error(`No se pudo borrar la foto ${attachment.id} de la salida ${orderId}.`, error);
        retained += 1;
      }
    }

    await db.collection("activityLogs").doc(`log_${Date.now()}_${orderId}`).set({
      action: retained ? "Limpieza parcial de fotos" : "Limpio fotos de salida devuelta",
      entityType: "orders",
      entityId: orderId,
      label: order.data().clientName || orderId,
      actorUid: request.auth.uid,
      actorName: request.auth.token?.name || request.auth.token?.email || "Usuario",
      actorRole: request.auth.uid === ADMIN_UID ? "admin" : "supervisor",
      createdAt: new Date().toISOString(),
      details: { deleted, retained },
    });

    return { deleted, retained };
  },
);
