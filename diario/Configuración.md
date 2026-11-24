---
tags: [configuracion]
---
# Configuración

## Google Cloud (Gmail API)
- Proyecto en console.cloud.google.com con **Gmail API** activada.
- Pantalla de consentimiento: tipo *Externo*, en modo *Prueba*, con el Gmail de David como usuario de prueba.
- Credencial: **ID de cliente OAuth → Aplicación de escritorio**. Se descarga el JSON y se guarda como `credentials.json` en la raíz del proyecto (en .gitignore).
- Permiso pedido: `https://www.googleapis.com/auth/gmail.readonly`.

## Local
- Puerto: `4321` (variable `PUERTO`, opcional).
- Intervalo de lectura: 60 s (variable `INTERVALO_SEGUNDOS`, opcional).
- Datos privados en `data/`: `token.json`, `correos.json`, `reglas.json`.
- Arranque con Windows: `npm run inicio:instalar` crea `dashboard-correo.vbs` en la carpeta Inicio del usuario.
