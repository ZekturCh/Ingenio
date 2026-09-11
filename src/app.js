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
  inventory: "inventoryItems",
  orders: "orders",
  movements: "inventoryMovements",
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

const uid = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const seedData = {
  clients: [],
  inventory: [],
  orders: [],
  movements: [],
  users: [],
  activityLogs: [],
};

let state = loadState();
let draftOrderItems = [];
let currentReturnOrderId = null;

const els = {
  navItems: document.querySelectorAll(".nav-item"),
  views: document.querySelectorAll(".view"),
  metricsGrid: document.querySelector("#metricsGrid"),
  activeOrders: document.querySelector("#activeOrders"),
  orderForm: document.querySelector("#orderForm"),
  orderClient: document.querySelector("#orderClient"),
  orderStart: document.querySelector("#orderStart"),
  orderEnd: document.querySelector("#orderEnd"),
  orderOwner: document.querySelector("#orderOwner"),
  orderAmount: document.querySelector("#orderAmount"),
  orderPaid: document.querySelector("#orderPaid"),
  orderInventory: document.querySelector("#orderInventory"),
  orderQty: document.querySelector("#orderQty"),
  orderNotes: document.querySelector("#orderNotes"),
  addOrderItem: document.querySelector("#addOrderItem"),
  orderBuilder: document.querySelector("#orderBuilder"),
  availabilityPill: document.querySelector("#availabilityPill"),
  ordersTable: document.querySelector("#ordersTable"),
  orderSearch: document.querySelector("#orderSearch"),
  orderStatusFilter: document.querySelector("#orderStatusFilter"),
  inventoryForm: document.querySelector("#inventoryForm"),
  itemName: document.querySelector("#itemName"),
  itemCategory: document.querySelector("#itemCategory"),
  itemQty: document.querySelector("#itemQty"),
  itemSize: document.querySelector("#itemSize"),
  itemLocation: document.querySelector("#itemLocation"),
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
  clientEmail: document.querySelector("#clientEmail"),
  clientIdNumber: document.querySelector("#clientIdNumber"),
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
  returnDialog: document.querySelector("#returnDialog"),
  returnForm: document.querySelector("#returnForm"),
  returnChecklist: document.querySelector("#returnChecklist"),
  returnNotes: document.querySelector("#returnNotes"),
  cancelReturn: document.querySelector("#cancelReturn"),
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
  if (!firebaseState.enabled || !record?.id) return;
  try {
    await setDoc(doc(firebaseState.db, remoteCollections[localKey], record.id), record, { merge: true });
  } catch (error) {
    console.warn("No se pudo guardar en Firestore.", error);
    showToast("Guardado local. Revisa Firebase/Auth para sincronizar.");
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

async function persistMany(localKey, records) {
  saveState();
  if (!firebaseState.enabled || !records.length) return;
  try {
    const batch = writeBatch(firebaseState.db);
    records.forEach((record) => {
      batch.set(doc(firebaseState.db, remoteCollections[localKey], record.id), record, { merge: true });
    });
    await batch.commit();
  } catch (error) {
    console.warn("No se pudo guardar lote en Firestore.", error);
    showToast("Importado local. Revisa Firebase/Auth para sincronizar.");
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
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getClient(clientId) {
  return state.clients.find((client) => client.id === clientId);
}

function activeOrders() {
  return state.orders.filter((order) => order.status !== "Devuelto" && order.status !== "Cancelado");
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
  if (order.status === "Devuelto") return "Devuelto";
  if (order.status === "Cancelado") return "Cancelado";
  return order.endDate < todayISO() ? "Vencido" : "Activo";
}

function splitChecklist(value) {
  return String(value || "")
    .split(/\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderAll() {
  renderSelects();
  renderMetrics();
  renderOrderBuilder();
  renderActiveOrders();
  renderOrdersTable();
  renderInventory();
  renderClients();
  renderUsers();
  renderAudit();
  renderSupervisionOrders();
  updateAdminVisibility();
  if (window.lucide) window.lucide.createIcons();
}

function renderSelects() {
  els.orderClient.innerHTML = state.clients
    .map((client) => `<option value="${client.id}">${escapeHtml(client.name)}</option>`)
    .join("");

  els.orderInventory.innerHTML = state.inventory
    .map((item) => {
      const available = availableQty(item);
      return `<option value="${item.id}" ${available === 0 ? "disabled" : ""}>${escapeHtml(item.name)} · disp. ${available}</option>`;
    })
    .join("");
}

function renderMetrics() {
  const active = activeOrders();
  const overdue = active.filter((order) => order.endDate < todayISO()).length;
  const unpaid = active.filter((order) => Number(order.amount || 0) > 0 && !order.paid).length;
  const availableUnits = state.inventory.reduce((sum, item) => sum + availableQty(item), 0);

  const metrics = [
    ["Pedidos activos", active.length, "En alquiler o reservados"],
    ["Unidades disponibles", availableUnits, "Stock libre ahora"],
    ["Pagos pendientes", unpaid, "Pedidos con monto sin pago"],
    ["Devoluciones vencidas", overdue, "Revisar hoy"],
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
    els.orderBuilder.innerHTML = `<div class="builder-empty">Agrega uno o varios items para formar el pedido. Cada item copia su checklist para revisar la devolucion despues.</div>`;
    els.availabilityPill.textContent = "Listo";
    els.availabilityPill.className = "status-pill ok";
    return;
  }

  els.orderBuilder.innerHTML = draftOrderItems
    .map((item, index) => `
      <div class="order-line">
        <div>
          <h4>${escapeHtml(item.name)} <span class="muted">x${item.quantity}</span></h4>
          <div class="chips">
            ${item.checklist.map((piece) => `<span class="chip">${escapeHtml(piece.name)}</span>`).join("") || `<span class="chip">Sin checklist</span>`}
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
  const active = activeOrders().slice(0, 6);
  if (!active.length) {
    els.activeOrders.innerHTML = `<div class="empty">No hay pedidos activos. La agenda esta limpia.</div>`;
    return;
  }

  els.activeOrders.innerHTML = active
    .map((order) => {
      const client = getClient(order.clientId);
      const status = orderState(order);
      return `
        <article class="order-card">
          <div class="panel-heading">
            <div>
              <h3>${escapeHtml(client?.name || "Cliente eliminado")}</h3>
              <p class="muted">${order.startDate} → ${order.endDate}</p>
            </div>
            <span class="tag ${status === "Vencido" ? "danger" : "ok"}">${status}</span>
          </div>
          <div class="chips">
            ${order.items.map((item) => `<span class="chip">${escapeHtml(item.name)} x${item.quantity}</span>`).join("")}
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
    .map((order) => ({ ...order, computedStatus: orderState(order), client: getClient(order.clientId) }))
    .filter((order) => filter === "all" || order.computedStatus === filter)
    .filter((order) => {
      const searchable = [
        order.id,
        order.client?.name,
        order.computedStatus,
        order.items.map((item) => item.name).join(" "),
      ].join(" ").toLowerCase();
      return searchable.includes(term);
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  els.ordersTable.innerHTML = rows.length
    ? rows
        .map((order) => `
          <tr>
            <td><strong>${order.id.replace("ord_", "#")}</strong><br><span class="muted">Creado por: ${escapeHtml(order.createdByName || order.owner || "Sin usuario")}</span></td>
            <td>${escapeHtml(order.client?.name || "Cliente eliminado")}<br><span class="muted">${escapeHtml(order.client?.phone || "")}</span></td>
            <td>${order.startDate}<br><span class="muted">${order.endDate}</span></td>
            <td>${order.items.map((item) => `${escapeHtml(item.name)} x${item.quantity}`).join("<br>")}</td>
            <td>${formatMoney(order.amount)}<br><span class="tag ${order.paid ? "ok" : "warn"}">${order.paid ? "Pagado" : "Pendiente"}</span></td>
            <td><span class="tag ${order.computedStatus === "Vencido" ? "danger" : order.computedStatus === "Devuelto" ? "" : "ok"}">${order.computedStatus}</span></td>
            <td>
              <div class="row-actions">
                ${isAdmin() && order.status === "Activo" ? `<button class="mini-button" data-return-order="${order.id}">Devolver</button>` : ""}
                ${isAdmin() ? `<button class="mini-button" data-toggle-paid="${order.id}">${order.paid ? "Marcar pendiente" : "Marcar pago"}</button>` : ""}
                ${isAdmin() && order.status === "Activo" ? `<button class="mini-button" data-cancel-order="${order.id}">Cancelar</button>` : ""}
                ${!isAdmin() ? `<span class="muted">Sin acciones</span>` : ""}
              </div>
            </td>
          </tr>
        `)
        .join("")
    : `<tr><td colspan="7" class="muted">No hay pedidos con ese filtro.</td></tr>`;
}

function renderInventory() {
  const term = els.inventorySearch.value.trim().toLowerCase();
  const filtered = state.inventory.filter((item) => {
    return [item.name, item.category, item.location, item.size].join(" ").toLowerCase().includes(term);
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
                <span>Talla: ${escapeHtml(item.size || "No aplica")}</span>
                <span>Ubicacion: ${escapeHtml(item.location || "Sin ubicacion")}</span>
                <span>Agregado por: ${escapeHtml(item.createdByName || "Sin usuario")}</span>
                <span>${escapeHtml(item.notes || "Sin notas")}</span>
              </div>
              <div class="chips">
                ${item.checklist.map((piece) => `<span class="chip">${escapeHtml(piece)}</span>`).join("") || `<span class="chip">Sin checklist</span>`}
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
    return [client.name, client.phone, client.email, client.idNumber].join(" ").toLowerCase().includes(term);
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
                  <span class="muted">${escapeHtml(client.idNumber || "Sin documento")}</span>
                </div>
                <span class="tag">${orderCount} pedido(s)</span>
              </div>
              <div class="client-meta">
                <span>${escapeHtml(client.phone || "Sin telefono")}</span>
                <span>${escapeHtml(client.email || "Sin correo")}</span>
                <span>Agregado por: ${escapeHtml(client.createdByName || "Sin usuario")}</span>
                <span>${escapeHtml(client.notes || "Sin notas")}</span>
              </div>
              <div class="row-actions ${isAdmin() ? "" : "is-hidden"}">
                <button class="mini-button" data-edit-client="${escapeHtml(client.id)}">Editar</button>
                <button class="mini-button" data-delete-client="${escapeHtml(client.id)}">Eliminar</button>
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
    .map((order) => ({ ...order, client: getClient(order.clientId), computedStatus: orderState(order) }))
    .filter((order) => order.computedStatus === "Vencido" || (order.status === "Devuelto" && Number(order.amount || 0) > 0 && !order.paid) || order.status === "Activo")
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  els.supervisionOrders.innerHTML = watched.length
    ? watched
        .map((order) => {
          const unpaidReturned = order.status === "Devuelto" && Number(order.amount || 0) > 0 && !order.paid;
          return `
            <article class="order-card">
              <div class="panel-heading">
                <div>
                  <h3>${escapeHtml(order.client?.name || "Cliente eliminado")}</h3>
                  <p class="muted">${order.startDate} → ${order.endDate} · ${escapeHtml(order.createdByName || order.owner || "Sin usuario")}</p>
                </div>
                <span class="tag ${order.computedStatus === "Vencido" || unpaidReturned ? "danger" : "ok"}">${unpaidReturned ? "Devuelto sin pago" : order.computedStatus}</span>
              </div>
              <div class="chips">
                ${order.items.map((item) => `<span class="chip">${escapeHtml(item.name)} x${item.quantity}</span>`).join("")}
              </div>
              <p class="muted">${formatMoney(order.amount)} · ${order.paid ? "Pagado" : "Pago pendiente"}</p>
            </article>
          `;
        })
        .join("")
    : `<div class="empty">No hay pedidos criticos ahora.</div>`;
}

function addDraftItem() {
  const inventoryId = els.orderInventory.value;
  const item = state.inventory.find((entry) => entry.id === inventoryId);
  if (!item) return;

  const qty = Math.max(1, Number(els.orderQty.value || 1));
  if (qty > availableQty(item)) {
    showToast(`No hay suficiente disponibilidad de ${item.name}.`);
    return;
  }

  const alreadyDrafted = draftOrderItems
    .filter((entry) => entry.inventoryId === inventoryId)
    .reduce((sum, entry) => sum + Number(entry.quantity), 0);

  if (alreadyDrafted + qty > availableQty(item)) {
    showToast(`Ese item ya esta comprometido en el borrador.`);
    return;
  }

  draftOrderItems.push({
    inventoryId: item.id,
    name: item.name,
    category: item.category,
    quantity: qty,
    checklist: item.checklist.map((piece) => ({ name: piece, returned: false })),
  });
  renderAll();
}

async function createOrder(event) {
  event.preventDefault();
  if (!firebaseState.active) {
    showToast("Tu usuario no está activo. Pide aprobación al admin.");
    return;
  }
  if (!draftOrderItems.length) {
    showToast("Agrega al menos un item al pedido.");
    return;
  }

  const order = {
    id: uid("ord"),
    clientId: els.orderClient.value,
    startDate: els.orderStart.value,
    endDate: els.orderEnd.value,
    owner: els.orderOwner.value.trim(),
    amount: Number(els.orderAmount.value || 0),
    paid: els.orderPaid.checked,
    status: "Activo",
    notes: els.orderNotes.value.trim(),
    createdAt: todayISO(),
    createdBy: currentActor().uid,
    createdByName: currentActor().name,
    returnedAt: null,
    returnNotes: "",
    items: structuredClone(draftOrderItems),
  };

  state.orders.push(order);
  order.items.forEach((item) => {
    state.movements.push({
      id: uid("mov"),
      type: "Salida",
      orderId: order.id,
      itemName: item.name,
      quantity: item.quantity,
      date: todayISO(),
      note: order.notes,
    });
  });

  draftOrderItems = [];
  els.orderForm.reset();
  setDefaultDates();
  saveState();
  await persistDoc("orders", order);
  await persistMany("movements", state.movements.filter((movement) => movement.orderId === order.id));
  await logActivity("Creo pedido", "orders", order.id, getClient(order.clientId)?.name || order.id, {
    items: order.items.map((item) => `${item.name} x${item.quantity}`),
    amount: order.amount,
    paid: order.paid,
  });
  renderAll();
  showToast("Pedido guardado y stock comprometido.");
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
    size: els.itemSize.value.trim(),
    location: els.itemLocation.value.trim(),
    checklist: splitChecklist(els.itemChecklist.value),
    notes: els.itemNotes.value.trim(),
    createdAt: previous?.createdAt || todayISO(),
    createdBy: previous?.createdBy || currentActor().uid,
    createdByName: previous?.createdByName || currentActor().name,
    updatedBy: currentActor().uid,
    updatedByName: currentActor().name,
    updatedAt: todayISO(),
  };
  const index = state.inventory.findIndex((entry) => entry.id === item.id);
  if (index >= 0) state.inventory[index] = item;
  else state.inventory.push(item);
  els.inventoryForm.reset();
  els.itemRecordId.value = "";
  els.itemSubmitLabel.textContent = "Crear item";
  els.cancelItemEdit.classList.add("is-hidden");
  await persistDoc("inventory", item);
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
  if (recordId && !isAdmin()) {
    showToast("Solo admin puede editar clientes existentes.");
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
    email: els.clientEmail.value.trim(),
    idNumber: els.clientIdNumber.value.trim(),
    notes: els.clientNotes.value.trim(),
    createdAt: previous?.createdAt || todayISO(),
    createdBy: previous?.createdBy || currentActor().uid,
    createdByName: previous?.createdByName || currentActor().name,
    updatedBy: currentActor().uid,
    updatedByName: currentActor().name,
    updatedAt: todayISO(),
  };
  const index = state.clients.findIndex((entry) => entry.id === client.id);
  if (index >= 0) state.clients[index] = client;
  else state.clients.push(client);
  els.clientForm.reset();
  els.clientRecordId.value = "";
  els.clientSubmitLabel.textContent = "Crear cliente";
  els.cancelClientEdit.classList.add("is-hidden");
  await persistDoc("clients", client);
  await logActivity(recordId ? "Edito cliente" : "Creo cliente", "clients", client.id, client.name, {
    phone: client.phone,
    email: client.email,
  });
  renderAll();
  showToast(recordId ? "Cliente actualizado." : "Cliente creado.");
}

function editClient(clientId) {
  if (!isAdmin()) return;
  const client = state.clients.find((entry) => entry.id === clientId);
  if (!client) return;
  els.clientRecordId.value = client.id;
  els.clientName.value = client.name || "";
  els.clientPhone.value = client.phone || "";
  els.clientEmail.value = client.email || "";
  els.clientIdNumber.value = client.idNumber || "";
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
    showToast("No puedes eliminar un cliente con pedidos activos.");
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
  els.itemSize.value = item.size || "";
  els.itemLocation.value = item.location || "";
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

function openReturnDialog(orderId) {
  const order = state.orders.find((entry) => entry.id === orderId);
  if (!order) return;
  currentReturnOrderId = orderId;
  els.returnNotes.value = "";
  els.returnChecklist.innerHTML = order.items
    .map((item, itemIndex) => `
      <div class="order-card">
        <h3>${escapeHtml(item.name)} <span class="muted">x${item.quantity}</span></h3>
        <div class="return-checklist">
          ${
            item.checklist.length
              ? item.checklist
                  .map((piece, pieceIndex) => `
                    <label class="check-item">
                      <input type="checkbox" checked data-return-piece="${itemIndex}:${pieceIndex}" />
                      <span>${escapeHtml(piece.name)}</span>
                    </label>
                  `)
                  .join("")
              : `<span class="muted">Este item no tiene checklist configurado.</span>`
          }
        </div>
      </div>
    `)
    .join("");
  els.returnDialog.showModal();
  if (window.lucide) window.lucide.createIcons();
}

async function closeReturn(event) {
  event.preventDefault();
  if (!isAdmin()) {
    showToast("Solo admin puede cerrar devoluciones.");
    return;
  }
  const order = state.orders.find((entry) => entry.id === currentReturnOrderId);
  if (!order) return;

  els.returnChecklist.querySelectorAll("[data-return-piece]").forEach((checkbox) => {
    const [itemIndex, pieceIndex] = checkbox.dataset.returnPiece.split(":").map(Number);
    order.items[itemIndex].checklist[pieceIndex].returned = checkbox.checked;
  });

  order.status = "Devuelto";
  order.returnedAt = todayISO();
  order.returnNotes = els.returnNotes.value.trim();
  order.returnedBy = currentActor().uid;
  order.returnedByName = currentActor().name;

  order.items.forEach((item) => {
    const missing = item.checklist.filter((piece) => !piece.returned).map((piece) => piece.name);
    state.movements.push({
      id: uid("mov"),
      type: missing.length ? "Ingreso parcial" : "Ingreso",
      orderId: order.id,
      itemName: item.name,
      quantity: item.quantity,
      date: todayISO(),
      note: missing.length ? `Faltantes: ${missing.join(", ")}` : order.returnNotes,
    });
  });

  currentReturnOrderId = null;
  els.returnDialog.close();
  saveState();
  await persistDoc("orders", order);
  await persistMany("movements", state.movements.filter((movement) => movement.orderId === order.id));
  await logActivity("Cerro devolucion", "orders", order.id, getClient(order.clientId)?.name || order.id, {
    returnedAt: order.returnedAt,
    paid: order.paid,
    missing: order.items.flatMap((item) => item.checklist.filter((piece) => !piece.returned).map((piece) => `${item.name}: ${piece.name}`)),
  });
  renderAll();
  showToast("Devolucion cerrada. El stock quedo liberado.");
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
      email: record.correo || "",
      idNumber: record.documento || "",
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
      size: record.talla || "",
      location: record.ubicacion || "",
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
  els.orderForm.addEventListener("submit", createOrder);
  els.inventoryForm.addEventListener("submit", createInventoryItem);
  els.cancelItemEdit.addEventListener("click", cancelInventoryEdit);
  els.clientForm.addEventListener("submit", createClient);
  els.cancelClientEdit.addEventListener("click", cancelClientEdit);
  els.orderSearch.addEventListener("input", renderOrdersTable);
  els.orderStatusFilter.addEventListener("change", renderOrdersTable);
  els.inventorySearch.addEventListener("input", renderInventory);
  els.clientSearch.addEventListener("input", renderClients);
  els.userSearch.addEventListener("input", renderUsers);
  els.userForm.addEventListener("submit", createUserProfile);
  els.auditSearch.addEventListener("input", renderAudit);
  els.importClients.addEventListener("click", importClients);
  els.importInventory.addEventListener("click", importInventory);
  els.exportJson.addEventListener("click", exportJson);
  els.resetDemo.addEventListener("click", resetDemo);
  els.logoutButton.addEventListener("click", logout);
  els.emailForm.addEventListener("submit", updateProfileEmail);
  els.passwordForm.addEventListener("submit", updateProfilePassword);
  els.returnForm.addEventListener("submit", closeReturn);
  els.cancelReturn.addEventListener("click", () => els.returnDialog.close());

  document.addEventListener("click", async (event) => {
    const removeDraft = event.target.closest("[data-remove-draft]");
    if (removeDraft) {
      draftOrderItems.splice(Number(removeDraft.dataset.removeDraft), 1);
      renderAll();
      return;
    }

    const returnOrder = event.target.closest("[data-return-order]");
    if (returnOrder) {
      if (!isAdmin()) {
        showToast("Solo admin puede modificar pedidos creados.");
        return;
      }
      openReturnDialog(returnOrder.dataset.returnOrder);
      return;
    }

    const togglePaid = event.target.closest("[data-toggle-paid]");
    if (togglePaid) {
      if (!isAdmin()) {
        showToast("Solo admin puede modificar pagos.");
        return;
      }
      const order = state.orders.find((entry) => entry.id === togglePaid.dataset.togglePaid);
      if (order) {
        order.paid = !order.paid;
        await persistDoc("orders", order);
        await logActivity(order.paid ? "Marco pago" : "Marco pago pendiente", "orders", order.id, getClient(order.clientId)?.name || order.id, {
          amount: order.amount,
          paid: order.paid,
        });
        renderAll();
        showToast(order.paid ? "Pago marcado como recibido." : "Pago marcado como pendiente.");
      }
      return;
    }

    const cancelOrder = event.target.closest("[data-cancel-order]");
    if (cancelOrder) {
      if (!isAdmin()) {
        showToast("Solo admin puede cancelar pedidos.");
        return;
      }
      const order = state.orders.find((entry) => entry.id === cancelOrder.dataset.cancelOrder);
      if (order && order.status !== "Devuelto" && confirm("¿Cancelar este pedido y liberar inventario?")) {
        order.status = "Cancelado";
        order.cancelledBy = currentActor().uid;
        order.cancelledByName = currentActor().name;
        await persistDoc("orders", order);
        await logActivity("Cancelo pedido", "orders", order.id, getClient(order.clientId)?.name || order.id, {
          items: order.items.map((item) => `${item.name} x${item.quantity}`),
        });
        renderAll();
        showToast("Pedido cancelado.");
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

    const editInventoryButton = event.target.closest("[data-edit-inventory]");
    if (editInventoryButton) {
      editInventoryItem(editInventoryButton.dataset.editInventory);
      return;
    }

    const deleteInventoryButton = event.target.closest("[data-delete-inventory]");
    if (deleteInventoryButton) {
      await deleteInventoryItem(deleteInventoryButton.dataset.deleteInventory);
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
