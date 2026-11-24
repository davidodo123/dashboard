---
tags: [roadmap]
---
# Roadmap

Regla: se trabaja **una fase cada vez** y no se pasa a la siguiente hasta que David la comprueba.

Leyenda: `[x]` hecho · `[ ]` pendiente · `[/]` empezado · `[-]` descartado

## Fase 1 · Necesario
- [x] Elegir plataforma: app local con Gmail API → [[Decisiones#App local con Gmail API]]
- [x] Login con Google (OAuth, solo lectura) y lectura periódica de correos nuevos
- [x] Clasificar por reglas de remitente/asunto: Códigos, Académico (por curso), Banco, Importante, Otros
- [x] Detectar códigos de verificación y extraer el código
- [x] Dashboard local resumido con secciones y botón de copiar código
- [x] Formulario para añadir un remitente nuevo y elegir su sección
- [x] Notificación en pantalla para códigos e importantes
- [x] Script para arrancar con Windows
- [x] David crea las credenciales OAuth en Google Cloud (`credentials.json`)
- [x] Rediseño visual: código destacado, reparto de la bandeja y remitentes ruidosos con «Mover a…»
- [/] David lo prueba con su Gmail real y ajusta las reglas de Moodle, Ilerna y Santander

## Fase 2 · Importante
- [ ] Resumen sin datos sensibles (contadores, último código no) para el Centro de Operaciones
- [ ] Marcar como leído/archivar desde el dashboard
- [ ] Sección propia «Empleo» (LinkedIn, InfoJobs, Indeed…): secciones personalizables
- [ ] Ajustar la detección de cursos con los asuntos reales de Moodle e Ilerna

## Fase 3 · Extra
- [ ] Icono en la bandeja del sistema
- [ ] Historial de gastos del banco por mes
