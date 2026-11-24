---
tags: [decisiones]
---
# Decisiones

## App local con Gmail API
**2026-11-24**: Opciones: app local en Node, solo local, o Electron. Elegida la app local (Node, en segundo plano) porque las notificaciones en pantalla y el arranque con el PC exigen que corra en el ordenador. El resumen al Centro de Operaciones va en la Fase 2.

## Gmail API con OAuth en vez de IMAP
**2026-11-24**: Todo llega a Gmail. OAuth con permiso `gmail.readonly`: no se guarda la contraseña y no puede borrar ni enviar correos. El token se queda en `data/token.json`, fuera de git.

## Sin framework y con una sola dependencia
**2026-11-24**: Servidor con `node:http` y dashboard en HTML/JS sin build. Única dependencia: `node-notifier`, para las notificaciones nativas de Windows. Arranca rápido y no hay nada que compilar.

## Clasificación por reglas editables
**2026-11-24**: Las reglas (remitente o asunto → sección) están en `data/reglas.json` y se editan desde el dashboard. La primera regla que coincide gana. Los códigos se detectan antes que cualquier regla, vengan de quien vengan.
