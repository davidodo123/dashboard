# Centro en vivo · rediseño de navegación — spec y direcciones

## Spec (común a las tres)

- **Qué es**: el centro local de David, abierto en ventana propia (Edge en modo app, ~1320×900) al encender el PC.
- **Para quién**: solo David. Programa (VS Code + Claude Code), juega (Steam), navega (Chrome/Opera), estudia (Moodle/Ilerna). Ya tiene un proyecto propio de lanzador con navegación en dos ejes (`xmb-launcher`): le gusta moverse, no leer un panel.
- **Qué pide**: «más navegación entre procesos y apartados de mi PC». Pasar de un panel de tarjetas que se lee de arriba abajo a **un sitio por el que se viaja**: entrar en un apartado, bajar a un proceso o proyecto, ver su detalle, volver; saltar de una app a su proyecto.
- **Apartados (contenido real, de la API local)**: Ahora (app delante, CPU/RAM/red), Apps de hoy (tiempo por app y categoría), Procesos (CPU/RAM en vivo), Proyectos (progreso, fases, siguiente tarea, commits, tokens), Correo (secciones y correos), Sistema (discos, equipo), Buzón (ideas y errores).
- **Tono**: instrumento personal, rápido, con teclado. No corporativo.
- **Formato**: HTML de escritorio 1320×900, datos reales vía `/api/centro`, `/api/vivo`, `/api/estado`. Navegable con ratón **y** teclado.
- **Restricciones**: sin dependencias externas (funciona sin internet); texto ≥14 px, etiquetas ≥12 px; los colores de categoría siguen la paleta validada (dataviz).
- **Imágenes**: no hacen falta; el material es el propio dato (tiempos, memoria, progreso).

## Seis candidatos

| # | Lógica | Mecanismo que se toma |骨架 / esqueleto | Dónde va el atrevimiento | La forma sale de… |
|---|---|---|---|---|---|
| 1 | **Mejor diseñador · su propio xmb-launcher** (el gusto ya declarado de David) | Dos ejes: apartados en horizontal, elementos en vertical, el foco se queda fijo y el mundo se mueve hacia él | Cruz fija a 1/3 de la pantalla; detalle grande a la derecha; Enter baja un nivel, Esc sube | Todo se mueve con flechas; el foco no se mueve nunca | Su propio launcher: la forma de navegar que ya eligió |
| 2 | **Referente real · vista en columnas de Finder + paleta de comandos tipo Raycast** | Cada selección abre la siguiente columna a la derecha; Ctrl+K salta a cualquier sitio por nombre | Barra de comando arriba, 3 columnas encadenadas + panel de detalle, barra de estado abajo | Densidad: todo tu PC en una sola pantalla de texto | Un PC es un árbol (apartado → elemento → detalle) |
| 3 | **Ruleta (#10 Bauhaus geométrica) + mecanismo de DaisyDisk/WinDirStat** | El área es la cantidad: tu PC dibujado como un mapa de bloques; clic para hacer zoom dentro de un bloque | Mapa a pantalla completa (treemap) con selector de «qué mide»: tiempo hoy / memoria / proyectos; migas arriba | Cero listas: navegas por superficies | «En qué se me va el día / la RAM» es literalmente una cuestión de tamaño |
| 4 | Mejor diseñador · Bret Victor (explicaciones explorables) | Cada número se puede arrastrar para cambiar el periodo | Texto narrativo con cifras vivas | La frase es la interfaz | — descartado: bonito, pero lee más que navega |
| 5 | Referente real · htop/btop | Barras por proceso en tiempo real, ordenables | Terminal a pantalla completa | Densidad tipo terminal | — descartado: es el «terminal» de manual (uso excesivo de metáfora) |
| 6 | Ruleta (este asiático #2 · página de xilografía Song) | Retícula vertical con columnas de texto | — | — | — descartado: no encaja con navegar un PC |

**Elegidas para versión completa: 1 (Ejes), 2 (Columnas) y 3 (Mapa).** Tienen esqueletos distintos (cruz fija / columnas encadenadas / superficies con zoom) y temperaturas distintas: oscuro y cinematográfico, claro y denso, y geometría de color plano.
