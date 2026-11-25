// Actividad: cuánto tiempo pasas en cada app, por categoría, y en cada proyecto (desde el título de VS Code).
// Solo se guarda el nombre de la app y el proyecto, nunca títulos de ventana. Un archivo por día en data/actividad/.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { RUTAS } from './almacen.js';

const DIR = path.join(RUTAS.raiz, 'data', 'actividad');
const INACTIVO_S = 120; // sin teclado ni ratón 2 min = no cuenta
const MAX_PASO_S = 10; // si la sonda se para (PC suspendido), no se suman huecos

// Categoría fija por app (el color de la categoría es fijo en la interfaz).
export const CATEGORIAS = ['Programar', 'Navegar', 'Juegos', 'Multimedia', 'Otros'];
const REGLAS_CATEGORIA = [
  ['Programar', /^(code|cursor|devenv|idea64|pycharm64|webstorm64|windowsterminal|wt|powershell|pwsh|cmd|git-bash|mintty|postman|docker desktop|github desktop|obsidian|claude|local|heidisql|mysqlworkbench|androidstudio64|studio64|virtualbox)$/i],
  ['Navegar', /^(opera|opera_gx|chrome|msedge|firefox|brave|vivaldi|arc)$/i],
  ['Juegos', /^(steam|steamwebhelper|epicgameslauncher|battle\.net|riotclientservices|leagueclient|league of legends|valorant|brawlhalla|marvel.*|sekiro|re\d.*|deadspace.*|factorygame|factorygame-win64-shipping|livesplit|xboxpcapp|gamebar)$/i],
  ['Multimedia', /^(spotify|vlc|stremio|capcut|obs64|photoshop|premiere pro|afterfx|resolve|audacity|wmplayer|music\.ui|video\.ui|discord|whatsapp|telegram)$/i],
];

export function categoria(proceso) {
  for (const [cat, re] of REGLAS_CATEGORIA) if (re.test(proceso || '')) return cat;
  return 'Otros';
}

const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

let proyectosConocidos = []; // nombres de carpeta de los proyectos (de proyectos.js)
export const fijarProyectos = (nombres) => (proyectosConocidos = nombres);

/** VS Code: "archivo - Carpeta - Visual Studio Code" -> proyecto conocido cuya carpeta aparece en el título. */
export function proyectoDeTitulo(proceso, titulo) {
  if (!/^(code|cursor)$/i.test(proceso || '') || !titulo) return null;
  const partes = titulo.split(' - ').map((p) => p.replace(/^[●•]\s*/, '').trim().toLowerCase());
  return proyectosConocidos.find((n) => partes.includes(n.toLowerCase())) || null;
}

let dia = null; // { fecha, apps: {nombre: {s, proceso, categoria}}, categorias: {}, proyectos: {}, tramos: [[ini, fin, categoria, app]] }
let anterior = null; // { t, clave }
let actual = null; // { app, proceso, categoria, proyecto, desde }
let cambiado = false;

async function cargar(fecha) {
  try {
    return JSON.parse(await readFile(path.join(DIR, `${fecha}.json`), 'utf8'));
  } catch {
    return { fecha, apps: {}, categorias: {}, proyectos: {}, tramos: [] };
  }
}

export async function guardar() {
  if (!dia || !cambiado) return;
  await mkdir(DIR, { recursive: true });
  await writeFile(path.join(DIR, `${dia.fecha}.json`), JSON.stringify(dia));
  cambiado = false;
}

export async function iniciar() {
  dia = await cargar(hoy());
  setInterval(guardar, 60_000);
  for (const s of ['SIGINT', 'SIGTERM']) process.on(s, async () => { await guardar(); process.exit(0); });
}

/** Recibe cada muestra de la sonda. */
export async function muestra(m) {
  if (!dia) return;
  if (dia.fecha !== hoy()) {
    await guardar();
    dia = await cargar(hoy());
    anterior = null;
  }
  const activo = m.app && m.inactivo < INACTIVO_S && m.app.proceso !== 'LockApp';
  if (!activo) {
    anterior = null;
    actual = null;
    return;
  }
  const nombre = m.app.nombre || m.app.proceso;
  const cat = categoria(m.app.proceso);
  const proyecto = proyectoDeTitulo(m.app.proceso, m.app.titulo);
  const clave = `${nombre}|${proyecto || ''}`;
  if (!actual || actual.clave !== clave) actual = { clave, app: nombre, proceso: m.app.proceso, categoria: cat, proyecto, desde: m.t };

  if (anterior) {
    const s = Math.min((m.t - anterior.t) / 1000, MAX_PASO_S);
    const a = (dia.apps[nombre] ||= { s: 0, proceso: m.app.proceso, categoria: cat });
    a.s += s;
    dia.categorias[cat] = (dia.categorias[cat] || 0) + s;
    if (proyecto) dia.proyectos[proyecto] = (dia.proyectos[proyecto] || 0) + s;
    // Tramos para la línea del día: se alarga el último si sigue la misma categoría y no hay hueco.
    const ult = dia.tramos.at(-1);
    if (ult && ult[2] === cat && m.t - ult[1] <= MAX_PASO_S * 1000) {
      ult[1] = m.t;
      ult[3] = nombre;
    } else {
      dia.tramos.push([anterior.t, m.t, cat, nombre]);
    }
    cambiado = true;
  }
  anterior = { t: m.t };
}

export function estado() {
  const apps = Object.entries(dia?.apps || {})
    .map(([nombre, a]) => ({ nombre, ...a, s: Math.round(a.s) }))
    .sort((a, b) => b.s - a.s);
  return {
    fecha: dia?.fecha,
    totalS: Math.round(Object.values(dia?.categorias || {}).reduce((s, x) => s + x, 0)),
    categorias: CATEGORIAS.map((c) => ({ categoria: c, s: Math.round(dia?.categorias[c] || 0) })),
    apps: apps.slice(0, 12),
    proyectos: Object.entries(dia?.proyectos || {}).map(([p, s]) => ({ proyecto: p, s: Math.round(s) })).sort((a, b) => b.s - a.s),
    tramos: dia?.tramos || [],
    ahora: actual ? { app: actual.app, categoria: actual.categoria, proyecto: actual.proyecto, desde: actual.desde } : null,
  };
}

/** Días anteriores para la gráfica semanal. */
export async function semana() {
  const dias = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    const f = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const x = f === dia?.fecha ? dia : await cargar(f);
    dias.push({ fecha: f, categorias: CATEGORIAS.map((c) => ({ categoria: c, s: Math.round(x.categorias[c] || 0) })) });
  }
  return dias;
}

/** Apps usadas en los últimos 7 días (para las favoritas del sistema de arranque). */
export async function appsSemana() {
  const dias = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    const f = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dias.push(f === dia?.fecha ? dia : await cargar(f));
  }
  return dias;
}
