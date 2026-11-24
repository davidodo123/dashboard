---
tags: [inicio]
---
# Dashboard de correo

App local que lee el Gmail de David, separa los correos importantes del spam por remitente y los muestra en un dashboard resumido:
- **Códigos**: los de verificación, con el código extraído para copiarlo.
- **Académico**: Moodle e Ilerna, separados por curso.
- **Banco**: los tickets de Santander, con el importe.
- **Importante** y **Otros** (spam y resto).

Si llega un código o un correo importante, sale una notificación en el PC. Arranca sola al iniciar Windows. Más adelante enviará un resumen al Centro de Operaciones.

- Repo: github.com/davidodo123/dashboard
- Dashboard local: http://127.0.0.1:4321
- Los correos y el token **nunca** se suben: viven en `data/` (en .gitignore).

## Fase actual
Fase 1 · Necesario: código hecho; falta que David cree las credenciales de Google y lo pruebe.

## Cómo usamos el diario
- [[Roadmap]]: fases y tareas (de aquí sale el % del panel).
- [[Ideas]]: bandeja de entrada.
- [[Decisiones]]: qué se decidió y por qué.
- [[Configuración]]: servicios y nombres de variables, nunca valores.
- `Diario/`: una nota por día.
