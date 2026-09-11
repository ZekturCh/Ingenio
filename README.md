# Ingenio Trajes OS

MVP web para administrar alquiler de trajes, clientes, inventario con checklist de piezas, salidas, devoluciones y pago opcional.

## Que incluye

- Panel operativo con pedidos activos, disponibilidad, pagos pendientes y vencidos.
- Creacion de clientes.
- Creacion de inventario con categoria, cantidad, talla, ubicacion y checklist.
- Creacion de pedidos con varios items y copia de checklist por salida.
- Cierre de devolucion revisando piezas entregadas.
- Importacion rapida desde CSV pegado desde Excel.
- Exportacion de respaldo JSON.
- Firebase conectado al proyecto `ingenioespectaculos`.
- Reglas de Firestore listas para produccion y pruebas.

## Probar local

Puedes abrir `index.html` directamente en el navegador.

Si prefieres servidor local:

```bash
npm install
npm run start
```

## Firebase

La app inicializa Firebase con el proyecto `ingenioespectaculos` y usa:

- `clients`
- `inventoryItems`
- `orders`
- `inventoryMovements`
- `users`
- `settings`

El codigo intenta iniciar sesion anonima para sincronizar. Si Firestore/Auth todavia no estan activos o las reglas bloquean el acceso, la app sigue funcionando con respaldo local en el navegador.

Para pruebas rapidas sin roles, puedes desplegar temporalmente `firestore-dev.rules` cambiando `firebase.json`:

```json
"firestore": {
  "rules": "firestore-dev.rules",
  "indexes": "firestore.indexes.json"
}
```

Para datos reales usa `firestore.rules`. Esa version exige usuarios con rol en la coleccion `users`.

Ejemplo de documento en `users/{uid}`:

```json
{
  "displayName": "Admin",
  "email": "admin@ingenio.com",
  "role": "admin",
  "active": true
}
```

Roles permitidos:

- `admin`: todo.
- `bodega`: clientes, inventario, pedidos y movimientos.
- `ventas`: clientes, pedidos e inventario.
- `lectura`: solo lectura.

## Subir cambios a GitHub

```bash
git add .
git commit -m "Clean repo and add Trajes OS Firebase MVP"
git push -u origin main
```

## Publicar en Firebase Hosting

1. Instala Firebase CLI si no la tienes:

```bash
npm install -g firebase-tools
```

2. Inicia sesion y selecciona proyecto:

```bash
firebase login
firebase use ingenioespectaculos
```

3. Publica hosting y reglas:

```bash
firebase deploy --only hosting,firestore
```

## Estado de datos

La app usa Firestore cuando las reglas permiten acceso. Si Firebase falla, conserva un respaldo local con `localStorage` para no perder el flujo de trabajo durante pruebas.
