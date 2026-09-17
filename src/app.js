import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  updateEmail,
  updatePassword,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  setDoc,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-functions.js";

const STORAGE_KEY = "trajes-os-v2";
const LOG_EXPORT_STORAGE_KEY = "trajes-os-last-log-export-count";
const LOG_EXPORT_THRESHOLD = 1000;
const ADMIN_UID = "kXOgLCRPC0VhkqQltsgO1feNPLO2";
const firebaseConfig = {
  apiKey: "AIzaSyDAYmwu9GD0R0BlL_6tUqOpUgByNci_Bhg",
  authDomain: "ingenioespectaculos.firebaseapp.com",
  projectId: "ingenioespectaculos",
  storageBucket: "ingenioespectaculos.firebasestorage.app",
  messagingSenderId: "185253280310",
  appId: "1:185253280310:web:fda7e38fb0688a09d43697",
};

const remoteCollections = {
  clients: "clients",
  orders: "orders",
  incidents: "incidents",
  activityLogs: "activityLogs",
};

const firebaseState = {
  auth: null,
  user: null,
  db: null,
  functions: null,
  enabled: false,
  uid: null,
  role: null,
  active: false,
  profile: null,
  unsubscribe: [],
  usersUnsubscribe: null,
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const addDaysToISO = (isoDate, days) => {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const currentWeekRange = () => {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  const start = date.toISOString().slice(0, 10);
  return { start, end: addDaysToISO(start, 6) };
};

const uid = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const seedData = {
  clients: [],
  inventory: [],
  orders: [],
  incidents: [],
  movements: [],
  users: [],
  activityLogs: [],
};

let state = loadState();
let draftOrderItems = [];
let currentReturnOrderId = null;
let currentEditOrderId = null;
let editOrderItems = [];
let lastExportedLogCount = Number(localStorage.getItem(LOG_EXPORT_STORAGE_KEY) || 0);
let logThresholdToastShown = false;

const els = {
  navItems: document.querySelectorAll(".nav-item"),
  views: document.querySelectorAll(".view"),
  metricsGrid: document.querySelector("#metricsGrid"),
  activeOrders: document.querySelector("#activeOrders"),
  orderForm: document.querySelector("#orderForm"),
  orderPartyModes: document.querySelectorAll('input[name="orderPartyMode"]'),
  outboundFields: document.querySelector("#outboundFields"),
  returnFields: document.querySelector("#returnFields"),
  incidentFields: document.querySelector("#incidentFields"),
  orderClient: document.querySelector("#orderClient"),
  orderStart: document.querySelector("#orderStart"),
  orderEnd: document.querySelector("#orderEnd"),
  orderOwner: document.querySelector("#orderOwner"),
  orderAmount: document.querySelector("#orderAmount"),
  orderPaid: document.querySelector("#orderPaid"),
  orderItemName: document.querySelector("#orderItemName"),
  orderItemDetails: document.querySelector("#orderItemDetails"),
  orderNotes: document.querySelector("#orderNotes"),
  addOrderItem: document.querySelector("#addOrderItem"),
  orderBuilder: document.querySelector("#orderBuilder"),
  returnClientSearch: document.querySelector("#returnClientSearch"),
  returnOrderSelect: document.querySelector("#returnOrderSelect"),
  returnOrderSummary: document.querySelector("#returnOrderSummary"),
  returnChecklist: document.querySelector("#returnChecklist"),
  returnReceivedBy: document.querySelector("#returnReceivedBy"),
  returnPayment: document.querySelector("#returnPayment"),
  returnReplacementPending: document.querySelector("#returnReplacementPending"),
  returnNotes: document.querySelector("#returnNotes"),
  editOrderDialog: document.querySelector("#editOrderDialog"),
  editOrderForm: document.querySelector("#editOrderForm"),
  editOrderMeta: document.querySelector("#editOrderMeta"),
  editOrderItems: document.querySelector("#editOrderItems"),
  editOrderItemName: document.querySelector("#editOrderItemName"),
  editOrderItemDetails: document.querySelector("#editOrderItemDetails"),
  addEditOrderItem: document.querySelector("#addEditOrderItem"),
  cancelOrderEdit: document.querySelector("#cancelOrderEdit"),
  incidentName: document.querySelector("#incidentName"),
  incidentNotes: document.querySelector("#incidentNotes"),
  availabilityPill: document.querySelector("#availabilityPill"),
  eventsBoard: document.querySelector("#eventsBoard"),
  reportsMetrics: document.querySelector("#reportsMetrics"),
  orderSearch: document.querySelector("#orderSearch"),
  orderStatusFilter: document.querySelector("#orderStatusFilter"),
  inventoryForm: document.querySelector("#inventoryForm"),
  itemName: document.querySelector("#itemName"),
  itemCategory: document.querySelector("#itemCategory"),
  itemQty: document.querySelector("#itemQty"),
  itemChecklist: document.querySelector("#itemChecklist"),
  itemNotes: document.querySelector("#itemNotes"),
  itemRecordId: document.querySelector("#itemRecordId"),
  itemSubmitLabel: document.querySelector("#itemSubmitLabel"),
  cancelItemEdit: document.querySelector("#cancelItemEdit"),
  inventoryGrid: document.querySelector("#inventoryGrid"),
  inventorySearch: document.querySelector("#inventorySearch"),
  clientForm: document.querySelector("#clientForm"),
  clientName: document.querySelector("#clientName"),
  clientPhone: document.querySelector("#clientPhone"),
  clientNotes: document.querySelector("#clientNotes"),
  clientRecordId: document.querySelector("#clientRecordId"),
  clientSubmitLabel: document.querySelector("#clientSubmitLabel"),
  cancelClientEdit: document.querySelector("#cancelClientEdit"),
  clientList: document.querySelector("#clientList"),
  clientSearch: document.querySelector("#clientSearch"),
  userForm: document.querySelector("#userForm"),
  userUid: document.querySelector("#userUid"),
  userName: document.querySelector("#userName"),
  userEmail: document.querySelector("#userEmail"),
  userPassword: document.querySelector("#userPassword"),
  userRole: document.querySelector("#userRole"),
  userActive: document.querySelector("#userActive"),
  userList: document.querySelector("#userList"),
  userSearch: document.querySelector("#userSearch"),
  currentAuthUid: document.querySelector("#currentAuthUid"),
  sessionAuthUid: document.querySelector("#sessionAuthUid"),
  auditSearch: document.querySelector("#auditSearch"),
  auditList: document.querySelector("#auditList"),
  logMaintenanceStatus: document.querySelector("#logMaintenanceStatus"),
  logMaintenanceHint: document.querySelector("#logMaintenanceHint"),
  logMaintenanceBox: document.querySelector("#logMaintenanceBox"),
  exportLogsCsv: document.querySelector("#exportLogsCsv"),
  clearActivityLogs: document.querySelector("#clearActivityLogs"),
  supervisionOrders: document.querySelector("#supervisionOrders"),
  clientsCsv: document.querySelector("#clientsCsv"),
  inventoryCsv: document.querySelector("#inventoryCsv"),
  importClients: document.querySelector("#importClients"),
  importInventory: document.querySelector("#importInventory"),
  exportJson: document.querySelector("#exportJson"),
  resetDemo: document.querySelector("#resetDemo"),
  logoutButton: document.querySelector("#logoutButton"),
  profileSummary: document.querySelector("#profileSummary"),
  emailForm: document.querySelector("#emailForm"),
  profileEmail: document.querySelector("#profileEmail"),
  passwordForm: document.querySelector("#passwordForm"),
  profilePassword: document.querySelector("#profilePassword"),
  storageMode: document.querySelector("#storageMode"),
  toast: document.querySelector("#toast"),
};

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return structuredClone(seedData);

  try {
    const parsed = JSON.parse(stored);
    return {
      clients: parsed.clients || [],
      inventory: parsed.inventory || [],
      orders: parsed.orders || [],
      incidents: parsed.incidents || [],
      movements: parsed.movements || [],
      users: parsed.users || [],
      activityLogs: parsed.activityLogs || [],
    };
  } catch {
    return structuredClone(seedData);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function initFirebase() {
  try {
    const app = initializeApp(firebaseConfig);
    firebaseState.auth = getAuth(app);
    firebaseState.db = getFirestore(app);
    firebaseState.functions = getFunctions(app);

    onAuthStateChanged(firebaseState.auth, async (user) => {
      if (!user) {
        window.location.href = "login.html";
        return;
      }

      firebaseState.user = user;
      firebaseState.uid = user.uid;
      firebaseState.enabled = true;
      await loadCurrentUserProfile();
      updateAdminVisibility();
      renderAll();

      await seedFirestoreIfEmpty();
      attachRemoteListeners();
      attachUsersListener();
      await logLoginOnce();
    });
  } catch (error) {
    firebaseState.enabled = false;
    els.storageMode.textContent = "Datos locales activos";
    console.warn("Firebase no disponible, usando localStorage.", error);
  }
}

async function loadCurrentUserProfile() {
  if (!firebaseState.enabled || !firebaseState.uid) return;
  try {
    const profile = await getDoc(doc(firebaseState.db, "users", firebaseState.uid));
    const data = profile.exists() ? profile.data() : null;
    firebaseState.profile = data || {
      displayName: firebaseState.user?.displayName || "Usuario",
      email: firebaseState.user?.email || "",
      role: firebaseState.uid === ADMIN_UID ? "admin" : "staff",
      active: firebaseState.uid === ADMIN_UID,
    };
    firebaseState.role = firebaseState.profile.role || "staff";
    firebaseState.active = firebaseState.profile.active === true;
    const shortUid = firebaseState.uid.slice(0, 8);
    const roleText = firebaseState.active && firebaseState.role ? firebaseState.role : "sin rol";
    els.storageMode.textContent = `Firestore · ${roleText} · ${shortUid}`;
    if (els.currentAuthUid) els.currentAuthUid.textContent = firebaseState.uid;
    if (els.sessionAuthUid) els.sessionAuthUid.textContent = firebaseState.uid;
    if (els.profileSummary) {
      els.profileSummary.textContent = `${firebaseState.user?.email || "Sin correo"} · ${roleText}`;
    }
    if (els.profileEmail) els.profileEmail.value = firebaseState.user?.email || "";
    await ensureCurrentUserProfile(profile.exists());
  } catch (error) {
    firebaseState.role = null;
    firebaseState.active = false;
    firebaseState.profile = null;
    els.storageMode.textContent = `Firestore · sin rol · ${firebaseState.uid.slice(0, 8)}`;
    if (els.currentAuthUid) els.currentAuthUid.textContent = firebaseState.uid;
    if (els.sessionAuthUid) els.sessionAuthUid.textContent = firebaseState.uid;
    if (els.profileSummary) els.profileSummary.textContent = `${firebaseState.user?.email || "Sin correo"} · sin rol`;
    console.warn("No se pudo leer el perfil del usuario actual.", error);
  }
}

async function ensureCurrentUserProfile(exists) {
  if (!firebaseState.enabled || !firebaseState.uid) return;
  const profile = {
    id: firebaseState.uid,
    displayName: firebaseState.profile?.displayName || firebaseState.user?.displayName || firebaseState.user?.email || "Usuario",
    email: firebaseState.user?.email || "",
    role: firebaseState.uid === ADMIN_UID ? "admin" : firebaseState.profile?.role || "staff",
    active: firebaseState.uid === ADMIN_UID ? true : firebaseState.profile?.active !== false,
    lastLoginAt: new Date().toISOString(),
    updatedAt: todayISO(),
    createdAt: firebaseState.profile?.createdAt || todayISO(),
  };

  try {
    await setDoc(doc(firebaseState.db, "users", firebaseState.uid), profile, { merge: true });
    firebaseState.profile = profile;
    firebaseState.role = profile.role;
    firebaseState.active = profile.active === true;
    const roleText = firebaseState.role || "staff";
    els.storageMode.textContent = `Firestore · ${roleText} · ${firebaseState.uid.slice(0, 8)}`;
    if (els.profileSummary) {
      els.profileSummary.textContent = `${firebaseState.user?.email || "Sin correo"} · ${roleText}`;
    }
    if (!exists) state.users.push(profile);
  } catch (error) {
    console.warn("No se pudo guardar perfil de usuario actual.", error);
  }
}

function isAdmin() {
  return firebaseState.enabled && (firebaseState.uid === ADMIN_UID || (firebaseState.active && firebaseState.role === "admin"));
}

function isSupervisor() {
  return firebaseState.enabled && firebaseState.active && firebaseState.role === "supervisor";
}

function canManageOrders() {
  return isAdmin() || isSupervisor();
}

function isSuperAdmin() {
  return isAdmin();
}

function updateAdminVisibility() {
  document.querySelectorAll("[data-admin-only]").forEach((element) => {
    element.classList.toggle("is-hidden", !isAdmin());
  });
  document.querySelectorAll("[data-superadmin-only]").forEach((element) => {
    element.classList.toggle("is-hidden", !isSuperAdmin());
  });

  const activeAdminView = document.querySelector(".view.active[data-admin-only], .view.active[data-superadmin-only]");
  const blockedAdmin = activeAdminView?.hasAttribute("data-admin-only") && !isAdmin();
  const blockedSuperAdmin = activeAdminView?.hasAttribute("data-superadmin-only") && !isSuperAdmin();
  if (blockedAdmin || blockedSuperAdmin) {
    document.querySelector('[data-view="dashboard"]').click();
  }
}

async function seedFirestoreIfEmpty() {
  return;
}

function attachRemoteListeners() {
  Object.entries(remoteCollections).forEach(([localKey, remoteName]) => {
    if (localKey === "activityLogs" && !isSuperAdmin()) return;
    const unsubscribe = onSnapshot(
      collection(firebaseState.db, remoteName),
      (snapshot) => {
        state[localKey] = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
        saveState();
        renderAll();
      },
      (error) => {
        console.warn(`No se pudo escuchar ${remoteName}.`, error);
      },
    );
    firebaseState.unsubscribe.push(unsubscribe);
  });
}

function attachUsersListener() {
  if (firebaseState.usersUnsubscribe) {
    firebaseState.usersUnsubscribe();
    firebaseState.usersUnsubscribe = null;
  }

  if (!isAdmin()) {
    state.users = [];
    renderUsers();
    return;
  }

  firebaseState.usersUnsubscribe = onSnapshot(
    collection(firebaseState.db, "users"),
    (snapshot) => {
      state.users = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
      saveState();
      renderUsers();
    },
    (error) => {
      console.warn("No se pudo escuchar users.", error);
      showToast("No tienes permisos para gestionar usuarios.");
    },
  );
}

async function persistDoc(localKey, record) {
  saveState();
  if (!firebaseState.enabled) return true;
  if (!record?.id) return false;
  try {
    await setDoc(doc(firebaseState.db, remoteCollections[localKey], record.id), record, { merge: true });
    return true;
  } catch (error) {
    console.warn("No se pudo guardar en Firestore.", error);
    showToast("Firebase rechazó el guardado. Revisa reglas de Firestore.");
    return false;
  }
}

async function deleteRemoteDoc(localKey, recordId) {
  saveState();
  if (!firebaseState.enabled || !recordId) return;
  try {
    await deleteDoc(doc(firebaseState.db, remoteCollections[localKey], recordId));
  } catch (error) {
    console.warn("No se pudo eliminar en Firestore.", error);
    showToast("Eliminado local. Revisa Firebase/Auth para sincronizar.");
  }
}

async function deleteRemoteDocs(localKey, recordIds) {
  saveState();
  if (!firebaseState.enabled || !recordIds.length) return true;
  try {
    for (let index = 0; index < recordIds.length; index += 450) {
      const batch = writeBatch(firebaseState.db);
      recordIds.slice(index, index + 450).forEach((recordId) => {
        batch.delete(doc(firebaseState.db, remoteCollections[localKey], recordId));
      });
      await batch.commit();
    }
    return true;
  } catch (error) {
    console.warn("No se pudieron limpiar documentos en Firestore.", error);
    showToast("Firebase rechazó la limpieza. Revisa reglas de Firestore.");
    return false;
  }
}

async function persistMany(localKey, records) {
  saveState();
  if (!firebaseState.enabled || !records.length) return true;
  try {
    const batch = writeBatch(firebaseState.db);
    records.forEach((record) => {
      batch.set(doc(firebaseState.db, remoteCollections[localKey], record.id), record, { merge: true });
    });
    await batch.commit();
    return true;
  } catch (error) {
    console.warn("No se pudo guardar lote en Firestore.", error);
    showToast("Firebase rechazó el guardado. Revisa reglas de Firestore.");
    return false;
  }
}

async function persistUserProfile(profile) {
  if (!isAdmin()) {
    showToast("Solo admin puede gestionar usuarios.");
    return false;
  }

  const record = {
    ...profile,
    updatedAt: todayISO(),
  };

  try {
    await setDoc(doc(firebaseState.db, "users", record.id), record, { merge: true });
    const index = state.users.findIndex((user) => user.id === record.id);
    if (index >= 0) state.users[index] = { ...state.users[index], ...record };
    else state.users.push(record);
    saveState();
    return true;
  } catch (error) {
    console.warn("No se pudo guardar el usuario.", error);
    showToast("No se pudo guardar el usuario.");
    return false;
  }
}

async function deleteUserProfile(uid) {
  if (!isAdmin()) {
    showToast("Solo admin puede eliminar usuarios.");
    return;
  }

  if (uid === firebaseState.uid) {
    showToast("No elimines tu propio perfil desde la app.");
    return;
  }

  await deleteDoc(doc(firebaseState.db, "users", uid));
  state.users = state.users.filter((user) => user.id !== uid);
  saveState();
  renderUsers();
  showToast("Usuario eliminado del acceso a la app.");
}

function currentActor() {
  const profile = state.users.find((user) => user.id === firebaseState.uid);
  return {
    uid: firebaseState.uid || "local",
    name: profile?.displayName || profile?.email || firebaseState.profile?.displayName || firebaseState.profile?.email || firebaseState.uid || "Usuario local",
    role: firebaseState.role || "local",
  };
}

async function logActivity(action, entityType, entityId, label, details = {}) {
  const actor = currentActor();
  const log = {
    id: uid("log"),
    action,
    entityType,
    entityId,
    label,
    details,
    actorUid: actor.uid,
    actorName: actor.name,
    actorRole: actor.role,
    createdAt: new Date().toISOString(),
  };
  state.activityLogs.unshift(log);
  await persistDoc("activityLogs", log);
  renderAudit();
}

async function logLoginOnce() {
  const key = `trajes-login-log-${firebaseState.uid}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  await logActivity("Inicio sesion", "users", firebaseState.uid, firebaseState.user?.email || firebaseState.uid, {
    email: firebaseState.user?.email || "",
  });
}

async function replaceRemoteWithSeed() {
  return;
}

function formatMoney(value) {
  const amount = Number(value || 0);
  if (!amount) return "Sin monto";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getClient(clientId) {
  return state.clients.find((client) => client.id === clientId);
}

function orderPartyMode() {
  return document.querySelector('input[name="orderPartyMode"]:checked')?.value || "outbound";
}

function getOrderParty(order) {
  if (order.clientName) {
    const client = getClient(order.clientId);
    return {
      name: client?.name || order.clientName || "Cliente sin nombre",
      phone: client?.phone || order.clientPhone || "",
      label: "Salida",
      notes: order.notes || "",
    };
  }

  if (order.partyType === "spectacle") {
    return {
      name: order.spectacle?.name || "Espectaculo sin nombre",
      phone: order.spectacle?.phone || "",
      label: "Espectaculo",
      notes: order.spectacle?.notes || "",
      coordinators: order.spectacle?.coordinators || [],
      isSpectacle: true,
    };
  }

  if (order.partyType === "contact") {
    return {
      name: order.contact?.name || "Contacto sin nombre",
      phone: order.contact?.phone || "",
      label: order.contact?.reason || "Contacto",
      notes: order.contact?.notes || "",
      isContact: true,
    };
  }

  const client = getClient(order.clientId);
  return {
    name: client?.name || "Contacto eliminado",
    phone: client?.phone || "",
    label: "Servicio",
    notes: client?.notes || "",
    isContact: false,
  };
}

function orderDateLabel(order) {
  if (order.partyType === "spectacle") {
    return [order.startDate, order.spectacle?.time].filter(Boolean).join(" · ");
  }
  return [order.startDate, order.endDate].filter(Boolean).join(" → ") || "Sin fecha";
}

function orderLabel(order) {
  return getOrderParty(order).name || order.id;
}

function activeOrders() {
  return state.orders.filter((order) => ["Activo", "Pendiente urgente"].includes(order.status || "Activo"));
}

function committedQty(inventoryId) {
  return activeOrders().reduce((total, order) => {
    return total + order.items.reduce((sum, item) => sum + (item.inventoryId === inventoryId ? Number(item.quantity) : 0), 0);
  }, 0);
}

function availableQty(item) {
  return Math.max(0, Number(item.quantity || 0) - committedQty(item.id));
}

function orderState(order) {
  if (order.status === "Pendiente urgente") return "Pendiente urgente";
  if (order.status === "Devuelto") return "Devuelto";
  if (order.status === "Cancelado") return "Cancelado";
  return order.endDate && order.endDate < todayISO() ? "Vencido" : "Activo";
}

function splitChecklist(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getItemChecklist(item) {
  const entries = item?.checklist || item?.details || [];
  const normalized = Array.isArray(entries) ? entries : splitChecklist(entries);
  return normalized.map((entry) => (typeof entry === "string" ? { name: entry, returned: false } : entry));
}

function missingEntries(order, includeUninspected = false) {
  if (!includeUninspected && !order.inspectedAt && !["Pendiente urgente", "Devuelto"].includes(order.status)) {
    return [];
  }
  return (order.items || []).flatMap((item) =>
    getItemChecklist(item)
      .filter((piece) => piece.returned !== true)
      .map((piece) => `${item.name}: ${piece.name}`),
  );
}

function orderDebt(order) {
  if (order.paid) return 0;
  return Math.max(0, Number(order.amount || 0) - Number(order.amountPaid || 0));
}

function renderAll() {
  renderSelects();
  renderMetrics();
  renderOrderBuilder();
  renderActiveOrders();
  renderOrdersTable();
  renderClients();
  renderUsers();
  renderLogMaintenance();
  renderAudit();
  renderSupervisionOrders();
  updateAdminVisibility();
  if (window.lucide) window.lucide.createIcons();
}

function renderSelects() {
  const selectedClient = els.orderClient.value;
  els.orderClient.innerHTML = state.clients
    .slice()
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    .map((client) => `<option value="${client.id}">${escapeHtml(client.name)}${client.phone ? ` · ${escapeHtml(client.phone)}` : ""}</option>`)
    .join("");
  els.orderClient.insertAdjacentHTML("afterbegin", `<option value="">Selecciona un cliente</option>`);
  if (selectedClient && [...els.orderClient.options].some((option) => option.value === selectedClient)) {
    els.orderClient.value = selectedClient;
  }
  renderReturnCandidates();
  updateManualOrderFields();
}

function updateManualOrderFields() {
  const mode = orderPartyMode();
  els.outboundFields.classList.toggle("is-hidden", mode !== "outbound");
  els.returnFields.classList.toggle("is-hidden", mode !== "return");
  els.incidentFields.classList.toggle("is-hidden", mode !== "incident");
  if (mode === "return") renderReturnCandidates();
}

function renderMetrics() {
  const active = activeOrders();
  const overdue = active.filter((order) => order.endDate < todayISO()).length;
  const unpaid = state.orders.filter((order) => orderDebt(order) > 0).length;
  const urgent = active.filter((order) => order.status === "Pendiente urgente").length;

  const metrics = [
    ["Salidas abiertas", active.length, "Pendientes de inspeccion"],
    ["Pendientes urgentes", urgent, "Articulo sin cerrar"],
    ["Pagos por confirmar", unpaid, "Con monto aun pendiente"],
    ["Retornos vencidos", overdue, "Revisar hoy"],
  ];

  els.metricsGrid.innerHTML = metrics
    .map(([label, value, hint]) => `
      <article class="metric">
        <span>${label}</span>
        <strong>${value}</strong>
        <span>${hint}</span>
      </article>
    `)
    .join("");
}

function renderOrderBuilder() {
  if (!draftOrderItems.length) {
    els.orderBuilder.innerHTML = `<div class="builder-empty">Agrega los articulos que salen. Sus lineas apareceran como checklist durante el retorno.</div>`;
    els.availabilityPill.textContent = "Listo";
    els.availabilityPill.className = "status-pill ok";
    return;
  }

  els.orderBuilder.innerHTML = draftOrderItems
    .map((item, index) => `
      <div class="order-line">
        <div>
          <h4>${escapeHtml(item.name)}</h4>
          <div class="chips">
            ${getItemChecklist(item).map((piece) => `<span class="chip">${escapeHtml(piece.name)}</span>`).join("") || `<span class="chip">Sin detalles</span>`}
          </div>
        </div>
        <button type="button" class="mini-button" data-remove-draft="${index}">Quitar</button>
      </div>
    `)
    .join("");
  els.availabilityPill.textContent = `${draftOrderItems.length} item(s)`;
  els.availabilityPill.className = "status-pill";
}

function renderActiveOrders() {
  const active = activeOrders()
    .slice()
    .sort((a, b) => String(a.endDate).localeCompare(String(b.endDate)))
    .slice(0, 6);
  if (!active.length) {
    els.activeOrders.innerHTML = `<div class="empty">No hay salidas abiertas. Todo esta al dia.</div>`;
    return;
  }

  els.activeOrders.innerHTML = active
    .map((order) => {
      const party = getOrderParty(order);
      const status = orderState(order);
      return `
        <article class="order-card">
          <div class="panel-heading">
            <div>
              <h3>${escapeHtml(party.name)}</h3>
              <p class="muted">${escapeHtml(party.label)} · ${escapeHtml(orderDateLabel(order))}</p>
            </div>
            <span class="tag ${status === "Vencido" ? "danger" : "ok"}">${status}</span>
          </div>
          <div class="chips">
            ${order.items.map((item) => `<span class="chip">${escapeHtml(item.name)}</span>`).join("")}
          </div>
          <div class="row-actions">
            ${canManageOrders() ? `<button class="mini-button" data-edit-order="${escapeHtml(order.id)}">Editar articulos</button>` : ""}
            <button class="mini-button" data-inspect-return="${escapeHtml(order.id)}">Inspeccionar</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderOrdersTable() {
  const term = els.orderSearch.value.trim().toLowerCase();
  const filter = els.orderStatusFilter.value;
  const rows = state.orders
    .map((order) => ({ ...order, computedStatus: orderState(order), party: getOrderParty(order) }))
    .filter((order) => filter === "all" || order.computedStatus === filter)
    .filter((order) => {
      const searchable = [
        order.id,
        order.party?.name,
        order.party?.phone,
        order.computedStatus,
        order.items.map((item) => `${item.name} ${getItemChecklist(item).map((piece) => piece.name).join(" ")}`).join(" "),
      ].join(" ").toLowerCase();
      return searchable.includes(term);
    });

  renderReportMetrics(rows);
  const clients = buildClientReports(rows);
  const pending = rows
    .filter((order) => ["Activo", "Pendiente urgente", "Vencido"].includes(order.computedStatus))
    .sort((a, b) => String(a.endDate).localeCompare(String(b.endDate)));
  const incidents = state.incidents
    .filter((incident) => [incident.name, incident.notes].join(" ").toLowerCase().includes(term))
    .slice()
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const history = rows
    .slice()
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 24);

  els.eventsBoard.innerHTML = `
    ${renderReportSection("Clientes que llevaron mas articulos", "Se cuenta cada linea registrada en los detalles", clients.map(renderClientReport).join(""), clients.length)}
    ${renderReportSection("Retornos y pendientes", "Ordenados por la fecha mas antigua de devolucion", pending.map(renderEventCard).join(""), pending.length)}
    ${renderReportSection("Incidencias registradas", "Deudas, perdidas y acuerdos que requieren seguimiento", incidents.map(renderIncidentCard).join(""), incidents.length)}
    ${renderReportSection("Historial de salidas", "Registros mas recientes", history.map(renderEventCard).join(""), history.length)}
  `;
}

function buildClientReports(orders) {
  const reports = new Map();
  orders.forEach((order) => {
    const party = order.party || getOrderParty(order);
    const key = order.clientId || party.name || order.id;
    const report = reports.get(key) || { name: party.name, phone: party.phone, articleCount: 0, debt: 0, missing: [], open: 0 };
    report.articleCount += (order.items || []).reduce((sum, item) => sum + Math.max(getItemChecklist(item).length, 1), 0);
    report.debt += orderDebt(order);
    report.missing.push(...missingEntries(order));
    if (["Activo", "Pendiente urgente", "Vencido"].includes(order.computedStatus || orderState(order))) report.open += 1;
    reports.set(key, report);
  });
  return [...reports.values()].sort((a, b) => b.articleCount - a.articleCount || b.debt - a.debt);
}

function renderReportMetrics(orders) {
  const debt = orders.reduce((sum, order) => sum + orderDebt(order), 0);
  const missing = orders.reduce((sum, order) => sum + missingEntries(order).length, 0);
  const pending = orders.filter((order) => ["Activo", "Pendiente urgente", "Vencido"].includes(order.computedStatus)).length;
  const metrics = [
    ["Salidas por cerrar", pending, "Aun requieren retorno"],
    ["Deuda registrada", formatMoney(debt), "Monto aun sin marcar como pago"],
    ["Articulos faltantes", missing, "Incluye pendientes urgentes"],
    ["Incidencias", state.incidents.length, "Registro de acuerdos y danos"],
  ];
  els.reportsMetrics.innerHTML = metrics.map(([label, value, hint]) => `<article class="metric"><span>${label}</span><strong>${value}</strong><span>${hint}</span></article>`).join("");
}

function renderReportSection(title, hint, content, count) {
  return `
    <section class="event-section">
      <div class="panel-heading">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p class="muted">${escapeHtml(hint)}</p>
        </div>
        <span class="tag">${count}</span>
      </div>
      <div class="event-list">
        ${content || `<div class="empty">No hay registros en esta seccion.</div>`}
      </div>
    </section>
  `;
}

function renderEventCard(order) {
  const status = order.computedStatus || orderState(order);
  const statusClass = ["Vencido", "Pendiente urgente"].includes(status) ? "danger" : status === "Devuelto" ? "" : "ok";
  const debt = orderDebt(order);
  const missingPieces = missingEntries(order);
  return `
    <article class="event-card">
      <div class="panel-heading">
        <div>
          <h3>${escapeHtml(order.party?.name || "Sin contacto")}</h3>
          <p class="muted">Salida · ${escapeHtml(orderDateLabel(order))} · Creado por: ${escapeHtml(order.createdByName || order.owner || "Sin usuario")}</p>
        </div>
        <div class="event-tags">
          <span class="tag ${statusClass}">${escapeHtml(status)}</span>
          <span class="tag ${debt > 0 ? "warn" : "ok"}">${debt > 0 ? "Pago pendiente" : "Pago al dia"}</span>
        </div>
      </div>
      <div class="event-card-grid">
        <div>
          <span class="muted">Items</span>
          <div class="chips">${(order.items || []).map((item) => `<span class="chip">${escapeHtml(item.name)}</span>`).join("")}</div>
        </div>
        <div>
          <span class="muted">Deuda</span>
          <strong>${formatMoney(debt)}</strong>
        </div>
        <div>
          <span class="muted">Faltantes</span>
          <strong>${missingPieces.length}</strong>
        </div>
      </div>
      ${missingPieces.length ? `<p class="muted">Faltantes registrados: ${escapeHtml(missingPieces.join(", "))}</p>` : ""}
      <div class="row-actions">
        ${canManageOrders() && ["Activo", "Pendiente urgente", "Vencido"].includes(status) ? `<button class="mini-button" data-edit-order="${escapeHtml(order.id)}">Editar articulos</button>` : ""}
        ${["Activo", "Pendiente urgente", "Vencido"].includes(status) ? `<button class="mini-button" data-inspect-return="${escapeHtml(order.id)}">Inspeccionar retorno</button>` : ""}
        ${canManageOrders() && debt > 0 ? `<button class="mini-button" data-toggle-paid="${escapeHtml(order.id)}">Marcar pago</button>` : ""}
      </div>
    </article>
  `;
}

function renderClientReport(report) {
  return `
    <article class="event-card">
      <div class="panel-heading">
        <div>
          <h3>${escapeHtml(report.name || "Cliente sin nombre")}</h3>
          <p class="muted">${escapeHtml(report.phone || "Sin telefono")}</p>
        </div>
        <span class="tag">${report.articleCount} articulo(s)</span>
      </div>
      <div class="event-card-grid">
        <div><span class="muted">Salidas abiertas</span><strong>${report.open}</strong></div>
        <div><span class="muted">Deuda</span><strong>${formatMoney(report.debt)}</strong></div>
        <div><span class="muted">Faltantes</span><strong>${report.missing.length}</strong></div>
      </div>
      ${report.missing.length ? `<p class="muted">Pendiente: ${escapeHtml(report.missing.join(", "))}</p>` : ""}
    </article>
  `;
}

function renderIncidentCard(incident) {
  return `
    <article class="event-card">
      <div class="panel-heading">
        <div>
          <h3>${escapeHtml(incident.name || "Sin nombre")}</h3>
          <p class="muted">Registrado por: ${escapeHtml(incident.createdByName || "Sin usuario")} · ${escapeHtml(incident.createdAt || "")}</p>
        </div>
        <span class="tag danger">Incidencia</span>
      </div>
      <p>${escapeHtml(incident.notes || "Sin detalle")}</p>
    </article>
  `;
}

function renderReturnCandidates() {
  if (!els.returnOrderSelect) return;
  const term = els.returnClientSearch?.value.trim().toLowerCase() || "";
  const selectedId = currentReturnOrderId || els.returnOrderSelect.value;
  const candidates = activeOrders()
    .map((order) => ({ ...order, party: getOrderParty(order), computedStatus: orderState(order) }))
    .filter((order) => [order.party.name, order.party.phone, order.id].join(" ").toLowerCase().includes(term))
    .sort((a, b) => String(a.endDate).localeCompare(String(b.endDate)));

  els.returnOrderSelect.innerHTML = candidates.length
    ? candidates.map((order) => `<option value="${escapeHtml(order.id)}">${escapeHtml(order.party.name)} · devuelve ${escapeHtml(order.endDate || "sin fecha")} · ${escapeHtml(order.computedStatus)}</option>`).join("")
    : `<option value="">No hay salidas pendientes para este filtro</option>`;

  const nextId = candidates.some((order) => order.id === selectedId) ? selectedId : candidates[0]?.id || "";
  els.returnOrderSelect.value = nextId;
  currentReturnOrderId = nextId || null;
  renderReturnSelection();
}

function renderReturnSelection() {
  const order = state.orders.find((entry) => entry.id === currentReturnOrderId);
  if (!order) {
    els.returnOrderSummary.innerHTML = `<div class="empty">Busca un cliente o selecciona una salida pendiente para revisar sus articulos.</div>`;
    els.returnChecklist.innerHTML = "";
    return;
  }
  const party = getOrderParty(order);
  els.returnOrderSummary.innerHTML = `<div class="order-card"><strong>${escapeHtml(party.name)}</strong><p class="muted">Salida: ${escapeHtml(order.startDate || "sin fecha")} · Devolucion prevista: ${escapeHtml(order.endDate || "sin fecha")} · Entrego: ${escapeHtml(order.owner || "Sin registro")}</p></div>`;
  els.returnChecklist.innerHTML = (order.items || []).map((item, itemIndex) => {
    const pieces = getItemChecklist(item);
    return `<div class="order-card"><h3>${escapeHtml(item.name)}</h3><div class="return-checklist">${pieces.map((piece, pieceIndex) => `<label class="check-item"><input type="checkbox" ${piece.returned === true ? "checked" : ""} data-return-piece="${itemIndex}:${pieceIndex}" /><span>${escapeHtml(piece.name)}</span></label>`).join("") || `<span class="muted">Sin articulos detallados.</span>`}</div></div>`;
  }).join("") || `<div class="empty">Esta salida no tiene articulos registrados.</div>`;
}

function renderInventory() {
  const term = els.inventorySearch.value.trim().toLowerCase();
  const filtered = state.inventory.filter((item) => {
    return [item.name, item.category, item.notes, (item.checklist || []).join(" ")].join(" ").toLowerCase().includes(term);
  });

  els.inventoryGrid.innerHTML = filtered.length
    ? filtered
        .map((item) => {
          const available = availableQty(item);
          const percent = item.quantity ? Math.round((available / item.quantity) * 100) : 0;
          const statusClass = available === 0 ? "danger" : available <= 1 ? "warn" : "ok";
          return `
            <article class="inventory-card">
              <div class="panel-heading">
                <div>
                  <h3>${escapeHtml(item.name)}</h3>
                  <span class="muted">${escapeHtml(item.category)}</span>
                </div>
                <span class="tag ${statusClass}">${available}/${item.quantity}</span>
              </div>
              <div class="inventory-meta">
                <span>Agregado por: ${escapeHtml(item.createdByName || "Sin usuario")}</span>
                <span>${escapeHtml(item.notes || "Sin notas")}</span>
              </div>
              <div class="chips">
                ${(item.checklist || []).map((piece) => `<span class="chip">${escapeHtml(piece)}</span>`).join("") || `<span class="chip">Sin checklist</span>`}
              </div>
              <div class="stock-line">
                <div class="stock-bar"><span style="width:${percent}%"></span></div>
                <strong>${percent}%</strong>
              </div>
              <div class="row-actions ${isAdmin() ? "" : "is-hidden"}">
                <button class="mini-button" data-edit-inventory="${escapeHtml(item.id)}">Editar</button>
                <button class="mini-button" data-delete-inventory="${escapeHtml(item.id)}">Eliminar</button>
              </div>
            </article>
          `;
        })
        .join("")
    : `<div class="empty">No se encontraron items.</div>`;
}

function renderClients() {
  const term = els.clientSearch.value.trim().toLowerCase();
  const filtered = state.clients.filter((client) => {
    return [client.name, client.phone, client.notes].join(" ").toLowerCase().includes(term);
  });

  els.clientList.innerHTML = filtered.length
    ? filtered
        .map((client) => {
          const orderCount = state.orders.filter((order) => order.clientId === client.id).length;
          return `
            <article class="client-row">
              <div class="panel-heading">
                <div>
                  <h3>${escapeHtml(client.name)}</h3>
                </div>
                <span class="tag">${orderCount} evento(s)</span>
              </div>
              <div class="client-meta">
                <span>${escapeHtml(client.phone || "Sin telefono")}</span>
                <span>Agregado por: ${escapeHtml(client.createdByName || "Sin usuario")}</span>
                <span>${escapeHtml(client.notes || "Sin notas")}</span>
              </div>
              <div class="row-actions ${canManageOrders() ? "" : "is-hidden"}">
                <button class="mini-button" data-edit-client="${escapeHtml(client.id)}">Editar</button>
                <button class="mini-button ${isAdmin() ? "" : "is-hidden"}" data-delete-client="${escapeHtml(client.id)}">Eliminar</button>
              </div>
            </article>
          `;
        })
        .join("")
    : `<div class="empty">No se encontraron clientes.</div>`;
}

function renderUsers() {
  if (!els.userList) return;
  updateAdminVisibility();
  if (els.currentAuthUid && firebaseState.uid) els.currentAuthUid.textContent = firebaseState.uid;
  if (els.sessionAuthUid && firebaseState.uid) els.sessionAuthUid.textContent = firebaseState.uid;

  if (!isAdmin()) {
    els.userList.innerHTML = `<div class="empty">Solo un administrador activo puede ver y gestionar usuarios.</div>`;
    return;
  }

  const term = els.userSearch.value.trim().toLowerCase();
  const filtered = state.users.filter((user) => {
    return [user.id, user.displayName, user.email, user.role].join(" ").toLowerCase().includes(term);
  });

  els.userList.innerHTML = filtered.length
    ? filtered
        .map((user) => `
          <article class="client-row">
            <div class="panel-heading">
              <div>
                <h3>${escapeHtml(user.displayName || "Sin nombre")}</h3>
                <span class="muted">${escapeHtml(user.email || user.id)}</span>
              </div>
              <span class="tag ${user.active ? "ok" : "warn"}">${user.active ? user.role : "inactivo"}</span>
            </div>
            <div class="client-meta">
              <span>UID: ${escapeHtml(user.id)}</span>
              <span>Rol: ${escapeHtml(user.role || "sin rol")}</span>
              <span>Último ingreso: ${user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("es-CO") : "Sin registro"}</span>
            </div>
            <div class="row-actions">
              <button class="mini-button" data-edit-user="${escapeHtml(user.id)}">Editar</button>
              <button class="mini-button" data-delete-user="${escapeHtml(user.id)}">Eliminar cuenta</button>
            </div>
          </article>
        `)
        .join("")
    : `<div class="empty">No hay usuarios con ese filtro.</div>`;
}

function renderLogMaintenance() {
  if (!els.logMaintenanceStatus || !els.logMaintenanceHint) return;
  if (!isSuperAdmin()) return;

  const count = state.activityLogs.length;
  const thresholdReached = count >= LOG_EXPORT_THRESHOLD;
  const exportIsFresh = count > 0 && lastExportedLogCount >= count;

  els.logMaintenanceStatus.textContent = `${count}/${LOG_EXPORT_THRESHOLD} logs`;
  els.logMaintenanceStatus.className = `status-pill ${thresholdReached ? "warn" : "ok"}`;
  els.logMaintenanceBox?.classList.toggle("needs-maintenance", thresholdReached);
  els.logMaintenanceHint.textContent = thresholdReached
    ? "La auditoría ya llegó al límite recomendado. Exporta el archivo antes de limpiar para mantener respaldo."
    : "Los logs se usan para auditoría de usuarios y cambios. Al llegar al límite recomendado, exporta y limpia para mantener la app ligera.";
  if (els.clearActivityLogs) els.clearActivityLogs.disabled = !exportIsFresh;
  if (thresholdReached && !logThresholdToastShown) {
    logThresholdToastShown = true;
    showToast("Auditoría llena: exporta logs y limpia cuando puedas.");
  }
}

function renderAudit() {
  if (!els.auditList) return;
  updateAdminVisibility();
  if (!isSuperAdmin()) {
    els.auditList.innerHTML = `<div class="empty">Solo super admin puede ver la auditoria.</div>`;
    return;
  }

  const term = els.auditSearch.value.trim().toLowerCase();
  const logs = state.activityLogs
    .filter((log) => [log.action, log.entityType, log.label, log.actorName, log.actorRole].join(" ").toLowerCase().includes(term))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 80);

  els.auditList.innerHTML = logs.length
    ? logs
        .map((log) => `
          <article class="client-row">
            <div class="panel-heading">
              <div>
                <h3>${escapeHtml(log.action)} · ${escapeHtml(log.label || log.entityId)}</h3>
                <span class="muted">${escapeHtml(log.entityType)} · ${new Date(log.createdAt).toLocaleString("es-CO")}</span>
              </div>
              <span class="tag">${escapeHtml(log.actorRole || "rol")}</span>
            </div>
            <div class="client-meta">
              <span>Usuario: ${escapeHtml(log.actorName || log.actorUid)}</span>
              <span>ID: ${escapeHtml(log.entityId || "")}</span>
              <span>${escapeHtml(JSON.stringify(log.details || {}))}</span>
            </div>
          </article>
        `)
        .join("")
    : `<div class="empty">Aun no hay actividad registrada.</div>`;
}

function renderSupervisionOrders() {
  if (!els.supervisionOrders) return;
  if (!isSuperAdmin()) {
    els.supervisionOrders.innerHTML = `<div class="empty">Solo super admin puede ver el resumen operativo.</div>`;
    return;
  }

  const watched = state.orders
    .map((order) => ({ ...order, party: getOrderParty(order), computedStatus: orderState(order) }))
    .filter((order) => ["Vencido", "Activo", "Pendiente urgente"].includes(order.computedStatus) || orderDebt(order) > 0)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  els.supervisionOrders.innerHTML = watched.length
    ? watched
        .map((order) => {
          const unpaidReturned = orderDebt(order) > 0;
          return `
            <article class="order-card">
              <div class="panel-heading">
                <div>
                  <h3>${escapeHtml(order.party?.name || "Sin contacto")}</h3>
                  <p class="muted">${escapeHtml(order.party?.label || "Servicio")} · ${escapeHtml(orderDateLabel(order))} · ${escapeHtml(order.createdByName || order.owner || "Sin usuario")}</p>
                </div>
                <span class="tag ${order.computedStatus === "Vencido" || unpaidReturned ? "danger" : "ok"}">${unpaidReturned ? "Devuelto sin pago" : order.computedStatus}</span>
              </div>
              <div class="chips">
                ${order.items.map((item) => `<span class="chip">${escapeHtml(item.name)}</span>`).join("")}
              </div>
              <p class="muted">${formatMoney(orderDebt(order))} · ${order.paid ? "Pagado" : "Pago pendiente"}</p>
            </article>
          `;
        })
        .join("")
    : `<div class="empty">No hay eventos criticos ahora.</div>`;
}

function addDraftItem() {
  const name = els.orderItemName.value.trim();
  const details = els.orderItemDetails.value.trim();
  if (!name) {
    showToast("Escribe el nombre del articulo.");
    els.orderItemName.focus();
    return;
  }
  if (!details) {
    showToast("Agrega los detalles: cada linea debe ser un articulo.");
    els.orderItemDetails.focus();
    return;
  }
  if (details.includes(",")) {
    showToast("Usa Enter para separar articulos; no uses comas.");
    els.orderItemDetails.focus();
    return;
  }
  const lines = splitChecklist(details);
  if (!lines.length) {
    showToast("Agrega al menos una linea en detalles.");
    return;
  }
  draftOrderItems.push({
    id: uid("item"),
    name,
    details: lines,
    checklist: lines.map((piece) => ({ name: piece, returned: false })),
  });
  els.orderItemName.value = "";
  els.orderItemDetails.value = "";
  renderAll();
}

function isEditableOrder(order) {
  return ["Activo", "Pendiente urgente", "Vencido"].includes(orderState(order));
}

function renderOrderItemsEditor() {
  if (!els.editOrderItems) return;
  if (!editOrderItems.length) {
    els.editOrderItems.innerHTML = `<div class="empty">No hay articulos. Agrega al menos uno antes de guardar.</div>`;
    return;
  }

  els.editOrderItems.innerHTML = editOrderItems
    .map((item, index) => {
      const details = getItemChecklist(item).map((piece) => piece.name).join("\n");
      return `
        <article class="edit-item-row" data-edit-order-index="${index}">
          <div class="panel-heading compact-heading">
            <strong>Articulo ${index + 1}</strong>
            <button type="button" class="mini-button" data-remove-edit-item="${index}">Quitar</button>
          </div>
          <div class="edit-item-fields">
            <label>
              Nombre
              <input type="text" data-edit-item-name value="${escapeHtml(item.name)}" />
            </label>
            <label>
              Detalles
              <textarea rows="4" data-edit-item-details placeholder="Cabeza&#10;Cuerpo&#10;Guantes">${escapeHtml(details)}</textarea>
            </label>
          </div>
        </article>
      `;
    })
    .join("");
}

function openOrderItemsEditor(orderId) {
  if (!canManageOrders()) {
    showToast("Solo supervisor o admin puede editar articulos.");
    return;
  }
  const order = state.orders.find((entry) => entry.id === orderId);
  if (!order || !isEditableOrder(order)) {
    showToast("Solo se pueden editar articulos de salidas abiertas.");
    return;
  }

  currentEditOrderId = order.id;
  editOrderItems = (order.items || []).map((item) => ({
    ...item,
    id: item.id || uid("item"),
    details: getItemChecklist(item).map((piece) => piece.name),
    checklist: getItemChecklist(item),
  }));
  const party = getOrderParty(order);
  els.editOrderMeta.innerHTML = `<div class="order-card"><strong>${escapeHtml(party.name)}</strong><p class="muted">Salida: ${escapeHtml(order.startDate || "sin fecha")} · Devolucion prevista: ${escapeHtml(order.endDate || "sin fecha")}</p></div>`;
  els.editOrderItemName.value = "";
  els.editOrderItemDetails.value = "";
  renderOrderItemsEditor();
  els.editOrderDialog.showModal();
  if (window.lucide) window.lucide.createIcons();
}

function addEditedOrderItem() {
  const name = els.editOrderItemName.value.trim();
  const details = els.editOrderItemDetails.value.trim();
  if (!name) {
    showToast("Escribe el nombre del articulo.");
    els.editOrderItemName.focus();
    return;
  }
  if (!details || details.includes(",")) {
    showToast("En detalles usa una linea por articulo y no uses comas.");
    els.editOrderItemDetails.focus();
    return;
  }
  const lines = splitChecklist(details);
  if (!lines.length) {
    showToast("Agrega al menos una linea en detalles.");
    return;
  }
  editOrderItems.push({
    id: uid("item"),
    name,
    details: lines,
    checklist: lines.map((piece) => ({ name: piece, returned: false })),
  });
  els.editOrderItemName.value = "";
  els.editOrderItemDetails.value = "";
  renderOrderItemsEditor();
}

async function saveEditedOrderItems(event) {
  event.preventDefault();
  if (!canManageOrders()) {
    showToast("Solo supervisor o admin puede editar articulos.");
    return;
  }
  const order = state.orders.find((entry) => entry.id === currentEditOrderId);
  if (!order || !isEditableOrder(order)) {
    showToast("La salida ya no esta disponible para edicion.");
    return;
  }

  const rows = [...els.editOrderItems.querySelectorAll("[data-edit-order-index]")];
  const items = [];
  for (const row of rows) {
    const index = Number(row.dataset.editOrderIndex);
    const previous = editOrderItems[index];
    const name = row.querySelector("[data-edit-item-name]").value.trim();
    const details = row.querySelector("[data-edit-item-details]").value.trim();
    if (!name || !details || details.includes(",")) {
      showToast("Cada articulo necesita nombre y detalles por lineas, sin comas.");
      return;
    }
    const lines = splitChecklist(details);
    if (!lines.length) {
      showToast("Cada articulo debe tener al menos un detalle.");
      return;
    }
    const previousPieces = getItemChecklist(previous);
    items.push({
      ...previous,
      id: previous.id || uid("item"),
      name,
      details: lines,
      checklist: lines.map((piece) => ({
        name: piece,
        returned: previousPieces.some((previousPiece) => previousPiece.name === piece && previousPiece.returned === true),
      })),
    });
  }

  if (!items.length) {
    showToast("La salida debe conservar al menos un articulo.");
    return;
  }
  const updatedOrder = { ...order, items };
  const saved = await persistDoc("orders", updatedOrder);
  if (!saved) return;
  const orderIndex = state.orders.findIndex((entry) => entry.id === order.id);
  state.orders[orderIndex] = updatedOrder;
  saveState();
  els.editOrderDialog.close();
  currentEditOrderId = null;
  editOrderItems = [];
  renderAll();
  showToast("Articulos de la salida actualizados.");
  void logActivity("Edito articulos de salida", "orders", order.id, orderLabel(updatedOrder), {
    items: items.map((item) => item.name),
  });
}

async function createOrder(event) {
  event.preventDefault();
  if (!firebaseState.active) {
    showToast("Tu usuario no está activo. Pide aprobación al admin.");
    return;
  }
  const mode = orderPartyMode();
  if (mode === "return") {
    await closeReturn();
    return;
  }
  if (mode === "incident") {
    await createIncident();
    return;
  }
  await createOutbound();
}

async function createOutbound() {
  const client = getClient(els.orderClient.value);
  if (!client) {
    showToast("Selecciona el cliente de la salida.");
    els.orderClient.focus();
    return;
  }
  if (!els.orderStart.value || !els.orderEnd.value) {
    showToast("Selecciona la fecha de salida y devolucion.");
    return;
  }
  if (els.orderEnd.value < els.orderStart.value) {
    showToast("La devolucion no puede ser antes de la salida.");
    return;
  }
  const owner = els.orderOwner.value.trim();
  if (!owner) {
    showToast("Escribe quien lo entrego.");
    els.orderOwner.focus();
    return;
  }
  if (!draftOrderItems.length) {
    showToast("Agrega al menos un articulo a la salida.");
    return;
  }
  const amount = Number(els.orderAmount.value || 0);
  const order = {
    id: uid("ord"),
    recordType: "outbound",
    partyType: "service",
    clientId: client.id,
    clientName: client.name,
    clientPhone: client.phone || "",
    startDate: els.orderStart.value,
    endDate: els.orderEnd.value,
    owner,
    amount,
    amountPaid: els.orderPaid.checked ? amount : 0,
    paid: els.orderPaid.checked || amount === 0,
    status: "Activo",
    notes: els.orderNotes.value.trim(),
    createdAt: todayISO(),
    createdBy: currentActor().uid,
    createdByName: currentActor().name,
    returnedAt: null,
    returnNotes: "",
    items: structuredClone(draftOrderItems),
  };
  const orderSaved = await persistDoc("orders", order);
  if (!orderSaved) return;

  state.orders.push(order);
  draftOrderItems = [];
  els.orderForm.reset();
  setDefaultDates();
  saveState();
  await logActivity("Registro salida", "orders", order.id, client.name, {
    items: order.items.map((item) => item.name),
    amount: order.amount,
    paid: order.paid,
  });
  renderAll();
  showToast("Salida registrada. Quedo lista para retorno e inspeccion.");
}

async function createIncident() {
  const name = els.incidentName.value.trim();
  const notes = els.incidentNotes.value.trim();
  if (!name || !notes) {
    showToast("Escribe el nombre y la nota de la incidencia.");
    return;
  }
  const incident = {
    id: uid("inc"),
    name,
    notes,
    status: "Abierta",
    createdAt: new Date().toISOString(),
    createdBy: currentActor().uid,
    createdByName: currentActor().name,
  };
  const saved = await persistDoc("incidents", incident);
  if (!saved) return;
  state.incidents.push(incident);
  els.incidentName.value = "";
  els.incidentNotes.value = "";
  saveState();
  await logActivity("Registro incidencia", "incidents", incident.id, incident.name, { notes: incident.notes });
  renderAll();
  showToast("Incidencia registrada para seguimiento.");
}

async function createInventoryItem(event) {
  event.preventDefault();
  const recordId = els.itemRecordId.value;
  if (recordId && !isAdmin()) {
    showToast("Solo admin puede editar inventario existente.");
    return;
  }
  if (!recordId && !firebaseState.active) {
    showToast("Tu usuario no está activo. Pide aprobación al admin.");
    return;
  }
  const previous = state.inventory.find((entry) => entry.id === recordId);
  const item = {
    id: recordId || uid("inv"),
    name: els.itemName.value.trim(),
    category: els.itemCategory.value,
    quantity: Math.max(1, Number(els.itemQty.value || 1)),
    checklist: splitChecklist(els.itemChecklist.value),
    notes: els.itemNotes.value.trim(),
    createdAt: previous?.createdAt || todayISO(),
    createdBy: previous?.createdBy || currentActor().uid,
    createdByName: previous?.createdByName || currentActor().name,
    updatedBy: currentActor().uid,
    updatedByName: currentActor().name,
    updatedAt: todayISO(),
  };
  const saved = await persistDoc("inventory", item);
  if (!saved) return;

  const index = state.inventory.findIndex((entry) => entry.id === item.id);
  if (index >= 0) state.inventory[index] = item;
  else state.inventory.push(item);
  els.inventoryForm.reset();
  els.itemRecordId.value = "";
  els.itemSubmitLabel.textContent = "Crear item";
  els.cancelItemEdit.classList.add("is-hidden");
  await logActivity(recordId ? "Edito inventario" : "Creo inventario", "inventoryItems", item.id, item.name, {
    quantity: item.quantity,
    category: item.category,
  });
  renderAll();
  showToast(recordId ? "Item actualizado." : "Item creado en inventario.");
}

async function createClient(event) {
  event.preventDefault();
  const recordId = els.clientRecordId.value;
  if (recordId && !canManageOrders()) {
    showToast("Solo supervisor o admin puede editar clientes existentes.");
    return;
  }
  if (!recordId && !firebaseState.active) {
    showToast("Tu usuario no está activo. Pide aprobación al admin.");
    return;
  }
  const previous = state.clients.find((entry) => entry.id === recordId);
  const client = {
    id: recordId || uid("cli"),
    name: els.clientName.value.trim(),
    phone: els.clientPhone.value.trim(),
    notes: els.clientNotes.value.trim(),
    createdAt: previous?.createdAt || todayISO(),
    createdBy: previous?.createdBy || currentActor().uid,
    createdByName: previous?.createdByName || currentActor().name,
    updatedBy: currentActor().uid,
    updatedByName: currentActor().name,
    updatedAt: todayISO(),
  };
  const saved = await persistDoc("clients", client);
  if (!saved) return;

  const index = state.clients.findIndex((entry) => entry.id === client.id);
  if (index >= 0) state.clients[index] = client;
  else state.clients.push(client);
  els.clientForm.reset();
  els.clientRecordId.value = "";
  els.clientSubmitLabel.textContent = "Crear cliente";
  els.cancelClientEdit.classList.add("is-hidden");
  await logActivity(recordId ? "Edito cliente" : "Creo cliente", "clients", client.id, client.name, {
    phone: client.phone,
  });
  renderAll();
  showToast(recordId ? "Cliente actualizado." : "Cliente creado.");
}

function editClient(clientId) {
  if (!canManageOrders()) return;
  const client = state.clients.find((entry) => entry.id === clientId);
  if (!client) return;
  els.clientRecordId.value = client.id;
  els.clientName.value = client.name || "";
  els.clientPhone.value = client.phone || "";
  els.clientNotes.value = client.notes || "";
  els.clientSubmitLabel.textContent = "Guardar cambios";
  els.cancelClientEdit.classList.remove("is-hidden");
  document.querySelector('[data-view="clients"]').click();
  els.clientName.focus();
}

function cancelClientEdit() {
  els.clientForm.reset();
  els.clientRecordId.value = "";
  els.clientSubmitLabel.textContent = "Crear cliente";
  els.cancelClientEdit.classList.add("is-hidden");
}

async function deleteClient(clientId) {
  if (!isAdmin()) {
    showToast("Solo admin puede eliminar clientes.");
    return;
  }
  const client = state.clients.find((entry) => entry.id === clientId);
  if (!client) return;
  const hasActiveOrders = activeOrders().some((order) => order.clientId === clientId);
  if (hasActiveOrders) {
    showToast("No puedes eliminar un cliente con eventos activos.");
    return;
  }
  if (!confirm(`¿Eliminar cliente ${client.name}?`)) return;
  state.clients = state.clients.filter((entry) => entry.id !== clientId);
  await deleteRemoteDoc("clients", clientId);
  await logActivity("Elimino cliente", "clients", clientId, client.name, {});
  renderAll();
  showToast("Cliente eliminado.");
}

function editInventoryItem(itemId) {
  if (!isAdmin()) return;
  const item = state.inventory.find((entry) => entry.id === itemId);
  if (!item) return;
  els.itemRecordId.value = item.id;
  els.itemName.value = item.name || "";
  els.itemCategory.value = item.category || "Vestuario";
  els.itemQty.value = item.quantity || 1;
  els.itemChecklist.value = (item.checklist || []).join("\n");
  els.itemNotes.value = item.notes || "";
  els.itemSubmitLabel.textContent = "Guardar cambios";
  els.cancelItemEdit.classList.remove("is-hidden");
  document.querySelector('[data-view="inventory"]').click();
  els.itemName.focus();
}

function cancelInventoryEdit() {
  els.inventoryForm.reset();
  els.itemRecordId.value = "";
  els.itemSubmitLabel.textContent = "Crear item";
  els.cancelItemEdit.classList.add("is-hidden");
}

async function deleteInventoryItem(itemId) {
  if (!isAdmin()) {
    showToast("Solo admin puede eliminar inventario.");
    return;
  }
  const item = state.inventory.find((entry) => entry.id === itemId);
  if (!item) return;
  if (committedQty(itemId) > 0) {
    showToast("No puedes eliminar un item que esta alquilado o activo.");
    return;
  }
  if (!confirm(`¿Eliminar item ${item.name}?`)) return;
  state.inventory = state.inventory.filter((entry) => entry.id !== itemId);
  await deleteRemoteDoc("inventory", itemId);
  await logActivity("Elimino inventario", "inventoryItems", itemId, item.name, {
    category: item.category,
    quantity: item.quantity,
  });
  renderAll();
  showToast("Item eliminado.");
}

function openReturnRegistration(orderId) {
  const order = state.orders.find((entry) => entry.id === orderId);
  if (!order) return;
  currentReturnOrderId = orderId;
  document.querySelector('[data-view="dashboard"]')?.click();
  const returnMode = document.querySelector('input[name="orderPartyMode"][value="return"]');
  if (returnMode) returnMode.checked = true;
  els.returnClientSearch.value = getOrderParty(order).name;
  els.returnNotes.value = "";
  els.returnReceivedBy.value = "";
  els.returnPayment.value = "";
  els.returnReplacementPending.checked = Boolean(order.replacementPending);
  updateManualOrderFields();
  renderReturnCandidates();
  els.returnClientSearch.focus();
}

async function closeReturn() {
  if (!canManageOrders()) {
    showToast("Solo supervisor o admin puede finalizar retornos.");
    return;
  }
  const order = state.orders.find((entry) => entry.id === currentReturnOrderId);
  if (!order) {
    showToast("Selecciona una salida pendiente.");
    return;
  }
  const receivedBy = els.returnReceivedBy.value.trim();
  if (!receivedBy) {
    showToast("Escribe quien recibio el retorno.");
    els.returnReceivedBy.focus();
    return;
  }

  order.items = (order.items || []).map((item) => ({
    ...item,
    checklist: getItemChecklist(item),
  }));
  els.returnChecklist.querySelectorAll("[data-return-piece]").forEach((checkbox) => {
    const [itemIndex, pieceIndex] = checkbox.dataset.returnPiece.split(":").map(Number);
    order.items[itemIndex].checklist[pieceIndex].returned = checkbox.checked;
  });

  const missing = missingEntries(order, true);
  const receivedPayment = Math.max(0, Number(els.returnPayment.value || 0));
  const paidBefore = Number(order.amountPaid || (order.paid ? order.amount || 0 : 0));
  const amountPaid = paidBefore + receivedPayment;
  order.amountPaid = amountPaid;
  order.paid = Number(order.amount || 0) === 0 || amountPaid >= Number(order.amount || 0);
  order.status = missing.length ? "Pendiente urgente" : "Devuelto";
  order.returnedAt = missing.length ? null : todayISO();
  order.inspectedAt = todayISO();
  order.returnNotes = els.returnNotes.value.trim();
  order.receivedBy = receivedBy;
  order.replacementPending = missing.length && els.returnReplacementPending.checked;
  order.returnedBy = currentActor().uid;
  order.returnedByName = currentActor().name;
  const orderSaved = await persistDoc("orders", order);
  if (!orderSaved) return;

  saveState();
  await logActivity(missing.length ? "Registro retorno pendiente" : "Finalizo retorno", "orders", order.id, orderLabel(order), {
    inspectedAt: order.inspectedAt,
    paid: order.paid,
    receivedBy,
    receivedPayment,
    missing,
    replacementPending: order.replacementPending,
  });
  currentReturnOrderId = null;
  els.returnReceivedBy.value = "";
  els.returnPayment.value = "";
  els.returnNotes.value = "";
  els.returnReplacementPending.checked = false;
  renderAll();
  showToast(missing.length ? "Retorno guardado como PENDIENTE URGENTE." : "Inspeccion finalizada y retorno cerrado.");
}

function parseCsv(text) {
  const rows = text.trim().split(/\r?\n/).filter(Boolean);
  if (rows.length < 2) return [];
  const headers = rows[0].split(",").map((header) => header.trim().toLowerCase());
  return rows.slice(1).map((row) => {
    const values = row.split(",").map((value) => value.trim());
    return headers.reduce((record, header, index) => {
      record[header] = values[index] || "";
      return record;
    }, {});
  });
}

async function importClients() {
  if (!isAdmin()) {
    showToast("Solo admin puede importar clientes.");
    return;
  }
  const records = parseCsv(els.clientsCsv.value);
  const created = [];
  records.forEach((record) => {
    if (!record.nombre) return;
    const client = {
      id: uid("cli"),
      name: record.nombre,
      phone: record.telefono || "",
      notes: record.notas || "",
      createdBy: currentActor().uid,
      createdByName: currentActor().name,
      createdAt: todayISO(),
    };
    state.clients.push(client);
    created.push(client);
  });
  await persistMany("clients", created);
  if (created.length) {
    await logActivity("Importo clientes", "clients", "bulk", `${created.length} clientes`, {
      count: created.length,
    });
  }
  renderAll();
  showToast(`${created.length} cliente(s) importado(s).`);
}

async function importInventory() {
  if (!isAdmin()) {
    showToast("Solo admin puede importar inventario.");
    return;
  }
  const records = parseCsv(els.inventoryCsv.value);
  const created = [];
  records.forEach((record) => {
    if (!record.nombre) return;
    const item = {
      id: uid("inv"),
      name: record.nombre,
      category: record.categoria || "Vestuario",
      quantity: Math.max(1, Number(record.cantidad || 1)),
      checklist: splitChecklist(record.checklist),
      notes: record.notas || "",
      createdBy: currentActor().uid,
      createdByName: currentActor().name,
      createdAt: todayISO(),
    };
    state.inventory.push(item);
    created.push(item);
  });
  await persistMany("inventory", created);
  if (created.length) {
    await logActivity("Importo inventario", "inventoryItems", "bulk", `${created.length} items`, {
      count: created.length,
    });
  }
  renderAll();
  showToast(`${created.length} item(s) importado(s).`);
}

async function createUserProfile(event) {
  event.preventDefault();
  if (!isAdmin()) {
    showToast("Solo admin puede crear usuarios.");
    return;
  }

  let targetUid = els.userUid.value.trim();
  const password = els.userPassword.value;

  if (!targetUid) {
    if (!els.userEmail.value.trim() || !password) {
      showToast("Para crear cuenta nueva escribe correo y contraseña inicial.");
      return;
    }

    try {
      const createAuthUser = httpsCallable(firebaseState.functions, "createAuthUser");
      const result = await createAuthUser({
        email: els.userEmail.value.trim(),
        password,
        displayName: els.userName.value.trim(),
        role: els.userRole.value,
        active: els.userActive.checked,
      });
      targetUid = result.data.uid;
      els.userUid.value = targetUid;
    } catch (error) {
      console.warn("No se pudo crear cuenta Auth.", error);
      showToast("No se pudo crear cuenta Auth. Despliega Cloud Functions primero.");
      return;
    }
  }

  const previous = state.users.find((user) => user.id === targetUid);
  const profile = {
    id: targetUid,
    displayName: els.userName.value.trim(),
    email: els.userEmail.value.trim(),
    role: els.userRole.value,
    active: els.userActive.checked,
    createdAt: previous?.createdAt || todayISO(),
  };

  const saved = await persistUserProfile(profile);
  if (!saved) return;
  await logActivity("Guardo usuario", "users", profile.id, profile.displayName || profile.email || profile.id, {
    role: profile.role,
    active: profile.active,
  });

  els.userForm.reset();
  els.userActive.checked = true;
  renderUsers();
  showToast("Perfil de usuario guardado.");
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `trajes-os-respaldo-${todayISO()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportLogsCsv() {
  if (!isSuperAdmin()) {
    showToast("Solo admin puede exportar logs.");
    return;
  }
  if (!state.activityLogs.length) {
    showToast("No hay logs para exportar.");
    return;
  }

  const headers = ["Fecha", "Accion", "Coleccion", "Documento", "Etiqueta", "Usuario", "Rol", "UID", "Detalles", "Log ID"];
  const rows = state.activityLogs
    .slice()
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
    .map((log) => [
      log.createdAt || "",
      log.action || "",
      log.entityType || "",
      log.entityId || "",
      log.label || "",
      log.actorName || "",
      log.actorRole || "",
      log.actorUid || "",
      JSON.stringify(log.details || {}),
      log.id || "",
    ]);

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `ingenio-auditoria-${todayISO()}.csv`);
  lastExportedLogCount = state.activityLogs.length;
  localStorage.setItem(LOG_EXPORT_STORAGE_KEY, String(lastExportedLogCount));
  renderLogMaintenance();
  showToast("Auditoría exportada. Ya puedes limpiar logs si deseas.");
}

async function clearActivityLogs() {
  if (!isSuperAdmin()) {
    showToast("Solo admin puede limpiar logs.");
    return;
  }
  if (!state.activityLogs.length) {
    showToast("No hay logs para limpiar.");
    return;
  }
  if (lastExportedLogCount < state.activityLogs.length) {
    showToast("Exporta los logs antes de limpiar.");
    return;
  }
  if (!confirm("Esto eliminará los logs de auditoría guardados. Asegúrate de conservar el archivo exportado. ¿Continuar?")) return;

  const ids = state.activityLogs.map((log) => log.id).filter(Boolean);
  const clearedRemote = await deleteRemoteDocs("activityLogs", ids);
  if (!clearedRemote) return;

  state.activityLogs = [];
  lastExportedLogCount = 0;
  localStorage.setItem(LOG_EXPORT_STORAGE_KEY, "0");
  saveState();
  renderAll();
  showToast("Logs limpiados. La auditoría quedó liviana.");
}

async function updateProfileEmail(event) {
  event.preventDefault();
  const nextEmail = els.profileEmail.value.trim();
  if (!nextEmail || !firebaseState.user) return;
  try {
    await updateEmail(firebaseState.user, nextEmail);
    firebaseState.user = firebaseState.auth.currentUser;
    await ensureCurrentUserProfile(true);
    await logActivity("Cambio correo propio", "users", firebaseState.uid, nextEmail, {});
    showToast("Correo actualizado.");
  } catch (error) {
    console.warn("No se pudo actualizar correo.", error);
    showToast("No se pudo cambiar el correo. Vuelve a iniciar sesion e intenta otra vez.");
  }
}

async function updateProfilePassword(event) {
  event.preventDefault();
  const nextPassword = els.profilePassword.value;
  if (!nextPassword || !firebaseState.user) return;
  try {
    await updatePassword(firebaseState.user, nextPassword);
    els.passwordForm.reset();
    await logActivity("Cambio contraseña propia", "users", firebaseState.uid, firebaseState.user.email || firebaseState.uid, {});
    showToast("Contraseña actualizada.");
  } catch (error) {
    console.warn("No se pudo actualizar contraseña.", error);
    showToast("No se pudo cambiar la contraseña. Vuelve a iniciar sesion e intenta otra vez.");
  }
}

async function logout() {
  await signOut(firebaseState.auth);
  window.location.href = "login.html";
}

async function resetDemo() {
  if (!isAdmin()) {
    showToast("Solo admin puede limpiar caché local.");
    return;
  }
  if (!confirm("Esto limpia la caché local de este navegador. No toca Firestore. ¿Continuar?")) return;
  state = structuredClone(seedData);
  draftOrderItems = [];
  localStorage.removeItem("trajes-os-v1");
  localStorage.removeItem(STORAGE_KEY);
  saveState();
  setDefaultDates();
  renderAll();
  showToast("Caché local limpia.");
}

function setDefaultDates() {
  els.orderStart.value = todayISO();
  els.orderEnd.value = addDays(2);
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => els.toast.classList.remove("show"), 2600);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function bindEvents() {
  els.navItems.forEach((item) => {
    item.addEventListener("click", () => {
      els.navItems.forEach((entry) => entry.classList.remove("active"));
      els.views.forEach((view) => view.classList.remove("active"));
      item.classList.add("active");
      document.querySelector(`#${item.dataset.view}`).classList.add("active");
    });
  });

  els.addOrderItem.addEventListener("click", addDraftItem);
  els.orderPartyModes.forEach((input) => input.addEventListener("change", updateManualOrderFields));
  els.orderForm.addEventListener("submit", createOrder);
  els.returnClientSearch.addEventListener("input", () => {
    currentReturnOrderId = null;
    renderReturnCandidates();
  });
  els.returnOrderSelect.addEventListener("change", () => {
    currentReturnOrderId = els.returnOrderSelect.value || null;
    renderReturnSelection();
  });
  els.editOrderForm.addEventListener("submit", saveEditedOrderItems);
  els.addEditOrderItem.addEventListener("click", addEditedOrderItem);
  els.cancelOrderEdit.addEventListener("click", () => {
    els.editOrderDialog.close();
    currentEditOrderId = null;
    editOrderItems = [];
  });
  els.clientForm.addEventListener("submit", createClient);
  els.cancelClientEdit.addEventListener("click", cancelClientEdit);
  els.orderSearch.addEventListener("input", renderOrdersTable);
  els.orderStatusFilter.addEventListener("change", renderOrdersTable);
  els.clientSearch.addEventListener("input", renderClients);
  els.userSearch.addEventListener("input", renderUsers);
  els.userForm.addEventListener("submit", createUserProfile);
  els.auditSearch.addEventListener("input", renderAudit);
  els.importClients.addEventListener("click", importClients);
  els.exportJson.addEventListener("click", exportJson);
  els.exportLogsCsv.addEventListener("click", exportLogsCsv);
  els.clearActivityLogs.addEventListener("click", clearActivityLogs);
  els.resetDemo.addEventListener("click", resetDemo);
  els.logoutButton.addEventListener("click", logout);
  els.emailForm.addEventListener("submit", updateProfileEmail);
  els.passwordForm.addEventListener("submit", updateProfilePassword);

  document.addEventListener("click", async (event) => {
    const removeDraft = event.target.closest("[data-remove-draft]");
    if (removeDraft) {
      draftOrderItems.splice(Number(removeDraft.dataset.removeDraft), 1);
      renderAll();
      return;
    }

    const removeEditedItem = event.target.closest("[data-remove-edit-item]");
    if (removeEditedItem) {
      editOrderItems.splice(Number(removeEditedItem.dataset.removeEditItem), 1);
      renderOrderItemsEditor();
      return;
    }

    const editOrder = event.target.closest("[data-edit-order]");
    if (editOrder) {
      openOrderItemsEditor(editOrder.dataset.editOrder);
      return;
    }

    const inspectReturn = event.target.closest("[data-inspect-return]");
    if (inspectReturn) {
      openReturnRegistration(inspectReturn.dataset.inspectReturn);
      return;
    }

    const togglePaid = event.target.closest("[data-toggle-paid]");
    if (togglePaid) {
      if (!canManageOrders()) {
        showToast("Solo supervisor o admin puede modificar pagos.");
        return;
      }
      const order = state.orders.find((entry) => entry.id === togglePaid.dataset.togglePaid);
      if (order) {
        order.paid = !order.paid;
        order.amountPaid = order.paid ? Number(order.amount || 0) : 0;
        await persistDoc("orders", order);
        await logActivity(order.paid ? "Marco pago" : "Marco pago pendiente", "orders", order.id, orderLabel(order), {
          amount: order.amount,
          paid: order.paid,
        });
        renderAll();
        showToast(order.paid ? "Pago marcado como recibido." : "Pago marcado como pendiente.");
      }
      return;
    }

    const editClientButton = event.target.closest("[data-edit-client]");
    if (editClientButton) {
      editClient(editClientButton.dataset.editClient);
      return;
    }

    const deleteClientButton = event.target.closest("[data-delete-client]");
    if (deleteClientButton) {
      await deleteClient(deleteClientButton.dataset.deleteClient);
      return;
    }

    const editUser = event.target.closest("[data-edit-user]");
    if (editUser) {
      const user = state.users.find((entry) => entry.id === editUser.dataset.editUser);
      if (user) {
        els.userUid.value = user.id;
        els.userName.value = user.displayName || "";
        els.userEmail.value = user.email || "";
        els.userRole.value = user.role || "staff";
        els.userActive.checked = user.active === true;
      }
      return;
    }

    const deleteUser = event.target.closest("[data-delete-user]");
    if (deleteUser) {
      if (confirm("Esto elimina la cuenta Auth y el perfil de acceso. ¿Continuar?")) {
        const deleted = state.users.find((entry) => entry.id === deleteUser.dataset.deleteUser);
        try {
          const deleteAuthUser = httpsCallable(firebaseState.functions, "deleteAuthUser");
          await deleteAuthUser({ uid: deleteUser.dataset.deleteUser });
          state.users = state.users.filter((user) => user.id !== deleteUser.dataset.deleteUser);
          saveState();
          renderUsers();
          showToast("Cuenta eliminada.");
        } catch (error) {
          console.warn("No se pudo eliminar cuenta Auth.", error);
          await deleteUserProfile(deleteUser.dataset.deleteUser);
        }
        await logActivity("Elimino usuario", "users", deleteUser.dataset.deleteUser, deleted?.displayName || deleted?.email || deleteUser.dataset.deleteUser, {});
      }
    }
  });
}

setDefaultDates();
bindEvents();
renderAll();
initFirebase();
