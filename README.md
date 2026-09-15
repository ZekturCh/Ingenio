# Ingenio Trajes OS

Plataforma web para registrar salidas, retornos, incidencias, clientes, pagos y pendientes operativos.

## Que incluye

- Iniciar registro con tres flujos: salida, retorno e incidencia.
- Salidas con cliente, fechas, responsable, monto, nota y artículos escritos manualmente por líneas.
- Retornos con búsqueda de cliente, checklist, responsable que recibe, pago y estado pendiente urgente para faltantes.
- Reportes de artículos por cliente, deuda registrada, retornos abiertos, faltantes e incidencias.
- Login con Firebase Auth Email/Password.
- Admin persistente por UID en `users/{uid}`.
- Admin: usuarios, clientes, pagos, retornos, importaciones y auditoria.
- Cloud Functions para crear y eliminar cuentas reales de Firebase Auth desde la app.
- Operadores: crear pedidos y editar su propio correo/contrasena.
- Auditoria de cambios: ingresos, salidas, retornos, incidencias, clientes, usuarios y pagos.
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
- `orders`
- `incidents`
- `users`
- `settings`
- `activityLogs`

La app exige login en `login.html`. Si no hay sesion activa, `index.html` redirige al login.

## Usuarios y roles

Hay un apartado `Usuarios` visible solo para usuarios con `role: "admin"` en Firestore.

Hay un apartado `Supervisión` visible solo para usuarios con `role: "admin"` en Firestore. Permite ver:

- Cambios recientes: quien creo, edito o elimino usuarios, clientes, inventario y pedidos.
- Pedidos activos.
- Pedidos vencidos.
- Pedidos devueltos pero con pago pendiente.

Importante: crear/eliminar cuentas reales desde la app requiere desplegar Cloud Functions. Sin Functions, el panel puede administrar perfiles, pero Auth se gestiona desde Firebase Console.

Flujo recomendado:

1. Activa Email/Password en Firebase Authentication.
2. Crea la cuenta `admin@ingenio.com`.
3. Copia el UID de esa cuenta en Firebase Authentication.
4. En Firestore crea el documento `users/{UID}` con `role: "admin"` y `active: true`. El UID admin fijo tambien esta permitido en reglas para bootstrap.
5. Entra por `login.html`.
6. Crea cuentas Auth para operadores en Firebase Console.
7. En `Usuarios`, crea o edita perfiles pegando el UID del operador.

Eliminar acceso desde la app borra el documento `users/{uid}`. La cuenta Auth queda viva hasta borrarla en Firebase Console.

El admin real se reconoce por UID + rol en Firestore. Si cambia su correo despues, conserva admin porque el UID no cambia.

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

- `admin`: control total. Se conserva aunque cambie el correo.
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
firebase deploy --only hosting,firestore,functions
```

## Estado de datos

La app usa Firestore cuando las reglas permiten acceso. Si Firebase falla, conserva un respaldo local con `localStorage` para no perder el flujo de trabajo durante pruebas.
