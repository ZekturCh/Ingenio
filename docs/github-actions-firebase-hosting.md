# GitHub Actions para Firebase Hosting

Firebase puede crear este flujo automaticamente con:

```bash
firebase init hosting:github
```

Cuando lo ejecutes, Firebase pedira autorizacion de GitHub y creara los archivos `.github/workflows`.

Recomendacion:

- Rama principal: `main`.
- Directorio publico: `.`
- Build command: deja vacio.
- Deploy automatico: si, para `main`.

Esta app no necesita build para funcionar. Si luego se conecta Firestore con variables por ambiente, se recomienda migrar a Vite o Next para manejar configuracion por entorno.
