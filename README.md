# Centro en vivo

**Sistema de arranque a pantalla completa** para Windows: un menú en dos ejes (apartados en horizontal, elementos en vertical, foco fijo) desde el que se lanzan juegos de Steam, apps, carpetas, fotos y proyectos, y que además enseña en vivo tu actividad, tus proyectos, el estado del PC, el correo y el buzón.

| Tecla | Qué hace |
|---|---|
| ← → | Cambiar de apartado (o de hermano, si has entrado en algo) |
| ↑ ↓ / rueda | Elegir elemento |
| Enter / A del mando | Jugar, abrir o entrar |
| Esc / B / clic derecho | Volver |
| O / X del mando | Abrir la carpeta en el Explorador |
| **Win + Esc** | Traer el sistema desde cualquier juego o app |

Apartados: Inicio (seguir con el último juego y proyecto, favoritas), Juegos, Apps, Fotos, Carpetas, Proyectos (Enter abre VS Code), Correo (Enter abre Gmail), PC y Buzón. La vista clásica de pestañas está en `/panel.html`.


Centro de control local de lo que hago en mi PC. Se abre solo al encender, en una ventana propia, y se actualiza cada pocos segundos. Convive con el panel diario del [Centro de Operaciones](https://github.com/davidodo123/centro-operaciones): aquí está todo en vivo, incluido lo privado, y nada sale del PC.

| Pestaña | Qué enseña |
|---|---|
| **Hoy** | La app que tienes delante, CPU/RAM/red en directo, tiempo activo por categoría, la línea del día, proyectos movidos hoy, lo pendiente (códigos, devoluciones, commits sin subir, buzón) y la agenda |
| **Correo** | Gmail clasificado: códigos de verificación, Importante, Académico (por curso), Banco, Amazon (devoluciones, envíos, pedidos) y quién te llena la bandeja |
| **Proyectos** | Cada repo local con `diario/Roadmap.md`: progreso, fase, siguiente tarea, commits, horas y tokens de Claude Code de hoy, cambios sin subir |
| **PC** | Gráficas de CPU, memoria y red de los últimos 3 min, procesos que más gastan, discos y equipo |

## Privacidad

- La actividad guarda solo el **nombre de la app** y, en VS Code, el **proyecto** sacado del título. Los títulos de ventana no se guardan.
- Si no tocas el teclado ni el ratón en 2 minutos, no cuenta.
- Correos, actividad, token de Google y reglas viven en `data/`, que no se sube a git. El buzón se lee de `~/buzon` y no se copia a ningún sitio.
- El servidor solo escucha en `127.0.0.1` y rechaza peticiones de otras webs.

## Puesta en marcha

1. `npm install`
2. Credenciales de Google (Gmail y Calendar, solo lectura):
   1. En [console.cloud.google.com](https://console.cloud.google.com) crea un proyecto y activa la **Gmail API** y la **Google Calendar API**.
   2. En **Pantalla de consentimiento OAuth** elige *Externo*, déjala en *Prueba* y añade tu Gmail como usuario de prueba.
   3. En **Clientes**, crea un **ID de cliente OAuth** de tipo **App de escritorio**.
   4. Descarga el JSON y guárdalo como `credentials.json` en esta carpeta.
3. `npm run inicio:instalar`. Crea:
   - **Centro en vivo** en la carpeta Inicio: se abre al encender y sale en *Configuración > Aplicaciones > Inicio* (ahí se desactiva).
   - **Centro** en el escritorio.
4. Abre el centro y pulsa **Conectar Gmail** en la pestaña Correo (y **Conectar Google Calendar** en Hoy si ya conectaste antes solo Gmail).

Para quitar los accesos directos: `npm run inicio:quitar`. A mano también se puede arrancar con `npm start` y abrir http://127.0.0.1:4321.

## Cómo funciona

- `scripts/sonda.ps1`: un único PowerShell sin ventana que cada 2 s dice qué app está delante, cuánto llevas sin tocar el PC, procesos y red, y que entre vuelta y vuelta escucha la tecla global Win+Esc.
- `src/actividad.js`: suma tiempo por app, por categoría (Programar, Navegar, Juegos, Multimedia, Otros) y por proyecto; un archivo por día en `data/actividad/`.
- `src/proyectos.js`: repos locales con `diario/Roadmap.md`. Horas y progreso con las mismas fórmulas que el Centro de Operaciones; tokens de hoy leídos de `~/.claude/projects`.
- `src/sistema.js`, `src/buzon.js`, `src/calendario.js`, `src/gmail.js`, `src/clasificar.js`: el resto de módulos.

## Reglas del correo

Se editan desde la pestaña Correo (sección Reglas) o en `data/reglas.json`. La primera que coincide gana; las nuevas van arriba.

```json
{ "de": "moodle", "seccion": "Académico", "subcategoriaRegex": "^\\[?([^\\]:\\-–]+)" }
{ "de": "santander", "seccion": "Banco" }
{ "de": "jefe@empresa.com", "seccion": "Importante", "notificar": true }
```

- `de` y `asunto`: texto que debe contener el remitente o el asunto (sin distinguir mayúsculas ni tildes).
- `subcategoriaRegex`: saca el curso del asunto (primer grupo).
- `subcategorias`: lista de `{ "nombre", "palabras" }`; gana la primera cuyas palabras salen en el asunto (así se separan las devoluciones de Amazon).
- `notificar`: notificación en pantalla. Los códigos y la sección Importante avisan siempre.

## Variables opcionales

| Variable | Por defecto |
|---|---|
| `PUERTO` | `4321` |
| `INTERVALO_SEGUNDOS` | `60` (lectura de Gmail) |

## Tests

`npm test`
