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

## Centro en vivo local
**2026-11-25**: David quiere un centro amplio de lo que hace, no solo correo ni un panel estático. Opciones: sustituir el panel de claude.ai o convivir. Elegido **convivir**: este dashboard local es el centro en vivo (actividad, proyectos, PC, buzón, calendario y correo, con datos privados que no salen del PC) y el panel de claude.ai sigue como resumen diario para el móvil. Se abre en ventana propia (modo app de Edge) al encender.

## Actividad: solo nombre de app y proyecto, nunca títulos
**2026-11-25**: La sonda lee la ventana activa cada 2 s. Se guarda el nombre de la app y, si es VS Code, el proyecto sacado del título; los títulos de ventana no se guardan. Si no tocas el teclado ni el ratón en 2 min no cuenta. Las fórmulas de horas y progreso son las mismas que `actualizar.mjs` del Centro de Operaciones.
