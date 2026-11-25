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
- [x] Arranque con Windows instalado (sale en Aplicaciones de arranque)
- [x] David crea las credenciales OAuth en Google Cloud (`credentials.json`)
- [x] Rediseño visual: código destacado, reparto de la bandeja y remitentes ruidosos con «Mover a…»
- [/] David lo prueba con su Gmail real y ajusta las reglas de Moodle, Ilerna y Santander

## Fase 2 · Centro en vivo
- [x] Sonda del PC (ventana activa, inactividad, procesos, red) sin ventanas ni dependencias → [[Decisiones#Centro en vivo local]]
- [x] Actividad: tiempo por app y por categoría (Programar, Navegar, Juegos, Multimedia), línea del día y tiempo por proyecto desde VS Code
- [x] Proyectos en vivo: cambios sin subir, commits y horas de hoy, progreso y siguiente tarea del Roadmap, tokens de Claude de hoy
- [x] Estado del PC: CPU, RAM, red en directo, discos y procesos que más consumen
- [x] Buzón (ideas y errores pendientes) y Google Calendar de hoy
- [ ] David activa la Google Calendar API y pulsa «Conectar Google Calendar»
- [x] Interfaz con pestañas Hoy · Correo · Proyectos · PC
- [x] Se abre en ventana propia al encender y acceso directo en el escritorio
- [ ] David usa el centro unos días y dice qué sobra o falta

## Fase 3 · Importante
- [ ] Resumen sin datos sensibles (contadores, último código no) para el Centro de Operaciones
- [ ] Marcar como leído/archivar desde el dashboard
- [x] Sección «Amazon» con devoluciones, envíos y pedidos separados
- [ ] Sección propia «Empleo» (LinkedIn, InfoJobs, Indeed…): secciones personalizables
- [ ] Ajustar la detección de cursos con los asuntos reales de Moodle e Ilerna

## Fase 4 · Extra
- [ ] Icono en la bandeja del sistema
- [ ] Historial de gastos del banco por mes
