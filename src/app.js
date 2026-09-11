import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  setDoc,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const STORAGE_KEY = "trajes-os-v1";

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
};

const firebaseState = {
  db: null,
  enabled: false,
  unsubscribe: [],
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const uid = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const seedData = {
  clients: [
    {
      id: "cli_demo_1",
      name: "Eventos Nova",
      phone: "+57 300 111 2233",
      email: "operaciones@nova.com",
      idNumber: "901222333",
      notes: "Cliente corporativo. Suele pedir para activaciones BTL.",
      createdAt: todayISO(),
    },
    {
      id: "cli_demo_2",
      name: "Laura Méndez",
      phone: "+57 311 555 4411",
      email: "laura@email.com",
      idNumber: "52.000.111",
      notes: "Prefiere recoger en bodega.",
      createdAt: todayISO(),
    },
  ],
  inventory: [
    {
      id: "inv_demo_1",
      name: "Traje Robot LED",
      category: "Traje completo",
      quantity: 3,
      size: "Adulto",
      location: "Rack 1",
      checklist: ["Cabeza", "Cuerpo", "Guantes", "Botas", "Bateria", "Cargador"],
      notes: "Revisar carga antes de entregar.",
      createdAt: todayISO(),
    },
    {
      id: "inv_demo_2",
      name: "Cabeza Dino",
      category: "Cabeza",
      quantity: 2,
      size: "Unica",
      location: "Estante C",
      checklist: ["Cabeza", "Bolsa protectora"],
      notes: "Solo cabeza, no incluye cuerpo.",
      createdAt: todayISO(),
    },
    {
      id: "inv_demo_3",
      name: "Botas negras personaje",
      category: "Calzado",
      quantity: 5,
      size: "40-43",
      location: "Caja calzado",
      checklist: ["Par izquierdo", "Par derecho"],
      notes: "Limpiar suela al regreso.",
      createdAt: todayISO(),
    },
  ],
  orders: [
    {
      id: "ord_demo_1",
      clientId: "cli_demo_1",
      startDate: todayISO(),
      endDate: addDays(2),
      owner: "Juan",
      amount: 450000,
      paid: true,
      status: "Activo",
      notes: "Entrega para activacion de marca.",
      createdAt: todayISO(),
      returnedAt: null,
      returnNotes: "",
      items: [
        {
          inventoryId: "inv_demo_1",
          name: "Traje Robot LED",
          category: "Traje completo",
          quantity: 1,
          checklist: [
            { name: "Cabeza", returned: false },
            { name: "Cuerpo", returned: false },
            { name: "Guantes", returned: false },
            { name: "Botas", returned: false },
            { name: "Bateria", returned: false },
            { name: "Cargador", returned: false },
          ],
        },
      ],
    },
  ],
  movements: [
    {
      id: "mov_demo_1",
      type: "Salida",
      orderId: "ord_demo_1",
      itemName: "Traje Robot LED",
      quantity: 1,
      date: todayISO(),
      note: "Pedido demo creado",
    },
  ],
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
  inventoryGrid: document.querySelector("#inventoryGrid"),
  inventorySearch: document.querySelector("#inventorySearch"),
  clientForm: document.querySelector("#clientForm"),
  clientName: document.querySelector("#clientName"),
  clientPhone: document.querySelector("#clientPhone"),
  clientEmail: document.querySelector("#clientEmail"),
  clientIdNumber: document.querySelector("#clientIdNumber"),
  clientNotes: document.querySelector("#clientNotes"),
  clientList: document.querySelector("#clientList"),
  clientSearch: document.querySelector("#clientSearch"),
  clientsCsv: document.querySelector("#clientsCsv"),
  inventoryCsv: document.querySelector("#inventoryCsv"),
  importClients: document.querySelector("#importClients"),
  importInventory: document.querySelector("#importInventory"),
  exportJson: document.querySelector("#exportJson"),
  resetDemo: document.querySelector("#resetDemo"),
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
    const auth = getAuth(app);
    firebaseState.db = getFirestore(app);

    await signInAnonymously(auth);
    firebaseState.enabled = true;
    els.storageMode.textContent = "Firestore sincronizado";

    await seedFirestoreIfEmpty();
    attachRemoteListeners();
  } catch (error) {
    firebaseState.enabled = false;
    els.storageMode.textContent = "Datos locales activos";
    console.warn("Firebase no disponible, usando localStorage.", error);
  }
}

async function seedFirestoreIfEmpty() {
  if (!firebaseState.enabled) return;
  const clientSnapshot = await getDocs(collection(firebaseState.db, remoteCollections.clients));
  const inventorySnapshot = await getDocs(collection(firebaseState.db, remoteCollections.inventory));
  if (!clientSnapshot.empty || !inventorySnapshot.empty) return;

  await replaceRemoteWithSeed();
}

function attachRemoteListeners() {
  Object.entries(remoteCollections).forEach(([localKey, remoteName]) => {
    const unsubscribe = onSnapshot(collection(firebaseState.db, remoteName), (snapshot) => {
      state[localKey] = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
      saveState();
      renderAll();
    });
    firebaseState.unsubscribe.push(unsubscribe);
  });
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

async function replaceRemoteWithSeed() {
  if (!firebaseState.enabled) return;
  const batch = writeBatch(firebaseState.db);

  for (const remoteName of Object.values(remoteCollections)) {
    const snapshot = await getDocs(collection(firebaseState.db, remoteName));
    snapshot.forEach((entry) => batch.delete(entry.ref));
  }

  Object.entries(remoteCollections).forEach(([localKey, remoteName]) => {
    seedData[localKey].forEach((record) => {
      batch.set(doc(firebaseState.db, remoteName, record.id), record);
    });
  });

  await batch.commit();
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
            <td><strong>${order.id.replace("ord_", "#")}</strong><br><span class="muted">${escapeHtml(order.owner || "Sin responsable")}</span></td>
            <td>${escapeHtml(order.client?.name || "Cliente eliminado")}<br><span class="muted">${escapeHtml(order.client?.phone || "")}</span></td>
            <td>${order.startDate}<br><span class="muted">${order.endDate}</span></td>
            <td>${order.items.map((item) => `${escapeHtml(item.name)} x${item.quantity}`).join("<br>")}</td>
            <td>${formatMoney(order.amount)}<br><span class="tag ${order.paid ? "ok" : "warn"}">${order.paid ? "Pagado" : "Pendiente"}</span></td>
            <td><span class="tag ${order.computedStatus === "Vencido" ? "danger" : order.computedStatus === "Devuelto" ? "" : "ok"}">${order.computedStatus}</span></td>
            <td>
              <div class="row-actions">
                ${
                  order.status !== "Devuelto"
                    ? `<button class="mini-button" data-return-order="${order.id}">Devolver</button>`
                    : `<button class="mini-button" disabled>Cerrado</button>`
                }
                <button class="mini-button" data-toggle-paid="${order.id}">${order.paid ? "Marcar pendiente" : "Marcar pago"}</button>
                <button class="mini-button" data-cancel-order="${order.id}">Cancelar</button>
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
                <span>${escapeHtml(item.notes || "Sin notas")}</span>
              </div>
              <div class="chips">
                ${item.checklist.map((piece) => `<span class="chip">${escapeHtml(piece)}</span>`).join("") || `<span class="chip">Sin checklist</span>`}
              </div>
              <div class="stock-line">
                <div class="stock-bar"><span style="width:${percent}%"></span></div>
                <strong>${percent}%</strong>
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
                <span>${escapeHtml(client.notes || "Sin notas")}</span>
              </div>
            </article>
          `;
        })
        .join("")
    : `<div class="empty">No se encontraron clientes.</div>`;
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
  renderAll();
  showToast("Pedido guardado y stock comprometido.");
}

async function createInventoryItem(event) {
  event.preventDefault();
  const item = {
    id: uid("inv"),
    name: els.itemName.value.trim(),
    category: els.itemCategory.value,
    quantity: Math.max(1, Number(els.itemQty.value || 1)),
    size: els.itemSize.value.trim(),
    location: els.itemLocation.value.trim(),
    checklist: splitChecklist(els.itemChecklist.value),
    notes: els.itemNotes.value.trim(),
    createdAt: todayISO(),
  };
  state.inventory.push(item);
  els.inventoryForm.reset();
  await persistDoc("inventory", item);
  renderAll();
  showToast("Item creado en inventario.");
}

async function createClient(event) {
  event.preventDefault();
  const client = {
    id: uid("cli"),
    name: els.clientName.value.trim(),
    phone: els.clientPhone.value.trim(),
    email: els.clientEmail.value.trim(),
    idNumber: els.clientIdNumber.value.trim(),
    notes: els.clientNotes.value.trim(),
    createdAt: todayISO(),
  };
  state.clients.push(client);
  els.clientForm.reset();
  await persistDoc("clients", client);
  renderAll();
  showToast("Cliente creado.");
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
  const order = state.orders.find((entry) => entry.id === currentReturnOrderId);
  if (!order) return;

  els.returnChecklist.querySelectorAll("[data-return-piece]").forEach((checkbox) => {
    const [itemIndex, pieceIndex] = checkbox.dataset.returnPiece.split(":").map(Number);
    order.items[itemIndex].checklist[pieceIndex].returned = checkbox.checked;
  });

  order.status = "Devuelto";
  order.returnedAt = todayISO();
  order.returnNotes = els.returnNotes.value.trim();

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
      createdAt: todayISO(),
    };
    state.clients.push(client);
    created.push(client);
  });
  await persistMany("clients", created);
  renderAll();
  showToast(`${created.length} cliente(s) importado(s).`);
}

async function importInventory() {
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
      createdAt: todayISO(),
    };
    state.inventory.push(item);
    created.push(item);
  });
  await persistMany("inventory", created);
  renderAll();
  showToast(`${created.length} item(s) importado(s).`);
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

async function resetDemo() {
  if (!confirm("Esto reinicia los datos demo en este navegador. ¿Continuar?")) return;
  state = structuredClone(seedData);
  draftOrderItems = [];
  saveState();
  try {
    await replaceRemoteWithSeed();
  } catch (error) {
    console.warn("No se pudo reiniciar Firestore.", error);
  }
  setDefaultDates();
  renderAll();
  showToast("Datos demo restaurados.");
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
  els.clientForm.addEventListener("submit", createClient);
  els.orderSearch.addEventListener("input", renderOrdersTable);
  els.orderStatusFilter.addEventListener("change", renderOrdersTable);
  els.inventorySearch.addEventListener("input", renderInventory);
  els.clientSearch.addEventListener("input", renderClients);
  els.importClients.addEventListener("click", importClients);
  els.importInventory.addEventListener("click", importInventory);
  els.exportJson.addEventListener("click", exportJson);
  els.resetDemo.addEventListener("click", resetDemo);
  els.returnForm.addEventListener("submit", closeReturn);
  els.cancelReturn.addEventListener("click", () => els.returnDialog.close());

  document.addEventListener("click", (event) => {
    const removeDraft = event.target.closest("[data-remove-draft]");
    if (removeDraft) {
      draftOrderItems.splice(Number(removeDraft.dataset.removeDraft), 1);
      renderAll();
      return;
    }

    const returnOrder = event.target.closest("[data-return-order]");
    if (returnOrder) {
      openReturnDialog(returnOrder.dataset.returnOrder);
      return;
    }

    const togglePaid = event.target.closest("[data-toggle-paid]");
    if (togglePaid) {
      const order = state.orders.find((entry) => entry.id === togglePaid.dataset.togglePaid);
      if (order) {
        order.paid = !order.paid;
        await persistDoc("orders", order);
        renderAll();
        showToast(order.paid ? "Pago marcado como recibido." : "Pago marcado como pendiente.");
      }
      return;
    }

    const cancelOrder = event.target.closest("[data-cancel-order]");
    if (cancelOrder) {
      const order = state.orders.find((entry) => entry.id === cancelOrder.dataset.cancelOrder);
      if (order && order.status !== "Devuelto" && confirm("¿Cancelar este pedido y liberar inventario?")) {
        order.status = "Cancelado";
        await persistDoc("orders", order);
        renderAll();
        showToast("Pedido cancelado.");
      }
    }
  });
}

setDefaultDates();
bindEvents();
renderAll();
initFirebase();
