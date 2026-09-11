# Ingenio Trajes OS

MVP web para administrar alquiler de trajes, clientes, inventario con checklist de piezas, salidas, devoluciones y pago opcional.

## Que incluye

- Panel operativo con pedidos activos, disponibilidad, pagos pendientes y vencidos.
- Login con Firebase Auth Email/Password.
- Admin principal por correo `admin@ingenio.com`.
- Admin: usuarios, clientes, inventario, pedidos existentes, pagos, devoluciones, importaciones y auditoria.
- Operadores: crear pedidos y editar su propio correo/contrasena.
- Auditoria de cambios: ingresos, pedidos, inventario, clientes, usuarios, pagos, cancelaciones y devoluciones.
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
- `activityLogs`

La app exige login en `login.html`. Si no hay sesion activa, `index.html` redirige al login.

## Usuarios y roles

Hay un apartado `Usuarios` visible solo para `admin@ingenio.com`.

Hay un apartado `Supervisión` visible solo para `admin@ingenio.com`. Permite ver:

- Cambios recientes: quien creo, edito o elimino usuarios, clientes, inventario y pedidos.
- Pedidos activos.
- Pedidos vencidos.
- Pedidos devueltos pero con pago pendiente.

Importante: ese apartado administra perfiles de acceso en Firestore (`users/{uid}`). Las cuentas reales se crean en Firebase Console > Authentication.

Flujo recomendado:

1. Activa Email/Password en Firebase Authentication.
2. Crea la cuenta `admin@ingenio.com`.
3. Entra por `login.html`.
4. Crea cuentas Auth para operadores en Firebase Console.
5. En `Usuarios`, crea o edita perfiles pegando el UID del operador.

Eliminar acceso desde la app borra el documento `users/{uid}`. La cuenta Auth queda viva hasta borrarla en Firebase Console.

El admin real se reconoce por correo. No hardcodees contrasenas en el codigo.

Para pruebas rapidas sin roles, puedes desplegar temporalmente `firestore-dev.rules` cambiando `firebase.json`:

```json
"firestore": {
  "rules": "firestore-dev.rules",
  "indexes": "firestore.indexes.json"
}
```

Para datos reales usa `firestore.rules`. Esa version exige usuario autenticado y limita escritura segun rol.

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

- `admin`: reservado para `admin@ingenio.com`.
- `staff`: operador normal. Puede crear pedidos y editar su propio perfil.

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
