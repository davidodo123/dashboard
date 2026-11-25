---
tags: [configuracion]
---
# Configuración

## Google Cloud (Gmail API)
- Proyecto en console.cloud.google.com con **Gmail API** activada.
- Pantalla de consentimiento: tipo *Externo*, en modo *Prueba*, con el Gmail de David como usuario de prueba.
- Credencial: **ID de cliente OAuth → Aplicación de escritorio**. Se descarga el JSON y se guarda como `credentials.json` en la raíz del proyecto (en .gitignore).
- **Google Calendar API** también activada (para la agenda).
- Permisos pedidos (solo lectura): `gmail.readonly` y `calendar.readonly`.

## Local
- Puerto: `4321` (variable `PUERTO`, opcional).
- Intervalo de lectura: 60 s (variable `INTERVALO_SEGUNDOS`, opcional).
- Datos privados en `data/`: `token.json`, `correos.json`, `reglas.json`.
- Arranque: `npm run inicio:instalar` crea «Centro en vivo» en la carpeta Inicio (`shell:startup`) y «Centro» en el escritorio. Los dos lanzan `data/arrancar.vbs`, que arranca el servidor sin ventana si no está en marcha y abre el centro en modo app de Edge. Icono: `data/centro.ico`, generado desde `public/icono.svg`.
- Actividad: `data/actividad/AAAA-MM-DD.json` (solo app, categoría, proyecto y tramos; sin títulos).
- Buzón: se lee de `~/buzon` (privado) y se hace `git pull` cada 15 min.
