# Modelo Firestore recomendado

Este modelo separa catalogo, pedidos y movimientos para que puedas auditar salidas, devoluciones, faltantes y pagos.

## users

```js
{
  displayName: "Juan",
  email: "juan@empresa.com",
  role: "admin", // admin, bodega, ventas, lectura
  active: true,
  createdAt: Timestamp
}
```

## clients

```js
{
  name: "Eventos Nova",
  phone: "+57...",
  email: "operaciones@nova.com",
  idNumber: "901222333",
  notes: "Cliente corporativo",
  status: "active",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## inventoryItems

```js
{
  name: "Traje Robot LED",
  category: "Traje completo",
  quantity: 3,
  size: "Adulto",
  location: "Rack 1",
  checklist: ["Cabeza", "Cuerpo", "Guantes", "Botas", "Bateria", "Cargador"],
  status: "active",
  notes: "Revisar carga antes de entregar",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## orders

```js
{
  clientId: "clients/{id}",
  startDate: "2026-09-10",
  endDate: "2026-09-12",
  status: "active", // draft, active, returned, cancelled
  amount: 450000,
  paid: true,
  owner: "Juan",
  notes: "Entrega para activacion",
  items: [
    {
      inventoryId: "inventoryItems/{id}",
      name: "Traje Robot LED",
      category: "Traje completo",
      quantity: 1,
      checklist: [
        { name: "Cabeza", returned: false },
        { name: "Cuerpo", returned: false }
      ]
    }
  ],
  returnedAt: null,
  returnNotes: "",
  createdBy: "users/{id}",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## inventoryMovements

```js
{
  type: "Salida", // Salida, Ingreso, Ingreso parcial, Ajuste, Daño, Perdida, Mantenimiento
  orderId: "orders/{id}",
  inventoryId: "inventoryItems/{id}",
  itemName: "Traje Robot LED",
  quantity: 1,
  note: "Faltantes: Guantes",
  createdBy: "users/{id}",
  createdAt: Timestamp
}
```

## Reglas importantes

- No borres pedidos cerrados; usa `status`.
- El pedido debe guardar copia de la checklist tal como salio.
- La disponibilidad se calcula con inventario total menos pedidos activos.
- Los movimientos son auditoria: cada salida, ingreso, faltante o ajuste debe quedar registrado.
- Para eventos futuros, agrega una coleccion `events` y permisos por rol cuando el flujo este claro.
