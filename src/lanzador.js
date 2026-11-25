// Sistema de arranque: catálogo de juegos (Steam), apps (menú Inicio + Store), carpetas y fotos,
// y lanzamiento seguro. El cliente solo envía identificadores del catálogo; nunca rutas ni comandos.
import { execFile, spawn } from 'node:child_process';
import { readFile, writeFile, readdir, stat, mkdir } from 'node:fs/promises';
import { existsSync, createReadStream } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { RUTAS } from './almacen.js';

const DATA = path.join(RUTAS.raiz, 'data');
const DIR_ICONOS = path.join(DATA, 'iconos');
const CACHE = path.join(DATA, 'catalogo.json');

const ps = (args) => new Promise((ok) => execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', ...args],
  { windowsHide: true, maxBuffer: 20 * 1024 * 1024 }, (err, out) => ok(err ? null : out)));

// ---------- Steam ----------
let steamDir = null;
let juegos = [];
const NO_JUEGOS = new Set(['228980', '1070560', '1391110', '1628350', '1826330']); // redistribuibles y runtimes

function vdf(texto, clave) {
  return [...texto.matchAll(new RegExp(`"${clave}"\\s+"([^"]*)"`, 'g'))].map((m) => m[1].replace(/\\\\/g, '\\'));
}

async function leerSteam() {
  if (!steamDir) {
    const out = await new Promise((ok) => execFile('reg', ['query', 'HKCU\\Software\\Valve\\Steam', '/v', 'SteamPath'], { windowsHide: true }, (e, o) => ok(e ? '' : o)));
    const m = /SteamPath\s+REG_SZ\s+(.+)/.exec(out);
    steamDir = m ? path.normalize(m[1].trim()) : null;
  }
  if (!steamDir || !existsSync(steamDir)) return [];
  const libs = vdf(await readFile(path.join(steamDir, 'steamapps', 'libraryfolders.vdf'), 'utf8').catch(() => ''), 'path');
  const lista = [];
  // La misma biblioteca puede venir escrita con distintas mayúsculas: se compara en minúsculas.
  const unicas = [...new Map([steamDir, ...libs].map((l) => [path.resolve(l).toLowerCase(), l])).values()];
  const vistos = new Set();
  for (const lib of unicas) {
    const apps = path.join(lib, 'steamapps');
    for (const f of await readdir(apps).catch(() => [])) {
      if (!/^appmanifest_\d+\.acf$/.test(f)) continue;
      const t = await readFile(path.join(apps, f), 'utf8').catch(() => '');
      const appid = vdf(t, 'appid')[0];
      if (!appid || NO_JUEGOS.has(appid) || vistos.has(appid)) continue;
      vistos.add(appid);
      lista.push({
        id: `steam-${appid}`, appid, nombre: vdf(t, 'name')[0] || appid,
        ultimaVez: Number(vdf(t, 'LastPlayed')[0] || 0) * 1000,
        tamGB: Math.round(Number(vdf(t, 'SizeOnDisk')[0] || 0) / 1e8) / 10,
      });
    }
  }
  return lista.sort((a, b) => b.ultimaVez - a.ultimaVez);
}

// Steam ha usado dos formatos: library_600x900.jpg (antiguo) y library_capsule.jpg (nuevo), a veces con el idioma (_spanish).
// Cada tipo tiene patrones por orden de preferencia.
const ARTE = {
  portada: [/^library_600x900(_2x)?\.jpg$/, /^library_capsule(_[a-z]+)?\.jpg$/],
  fondo: [/^library_hero(_(?!blur)[a-z]+)?\.jpg$/],
  desenfocado: [/^library_hero_blur(_[a-z]+)?\.jpg$/, /^library_hero(_(?!blur)[a-z]+)?\.jpg$/],
  logo: [/^logo(_[a-z]+)?\.png$/],
  cabecera: [/^header\.jpg$/, /^library_header(_[a-z]+)?\.jpg$/],
};
const cacheArte = new Map();
async function buscarArte(appid, tipo) {
  const k = `${appid}|${tipo}`;
  if (cacheArte.has(k)) return cacheArte.get(k);
  const base = path.join(steamDir || '', 'appcache', 'librarycache');
  const archivos = [];
  const recorrer = async (d, prof) => {
    for (const e of await readdir(d, { withFileTypes: true }).catch(() => [])) {
      if (e.isFile()) archivos.push(path.join(d, e.name));
      else if (e.isDirectory() && prof < 2) await recorrer(path.join(d, e.name), prof + 1);
    }
  };
  await recorrer(path.join(base, appid), 0);
  let encontrado = null;
  for (const patron of ARTE[tipo]) {
    // dentro de un mismo patrón, mejor la versión en español si existe
    const c = archivos.filter((f) => patron.test(path.basename(f))).sort((x, y) => /_spanish/.test(y) - /_spanish/.test(x));
    if (c.length) { encontrado = c[0]; break; }
  }
  // Formato antiguo de Steam: <appid>_library_600x900.jpg en la raíz
  if (!encontrado && tipo === 'portada' && existsSync(path.join(base, `${appid}_library_600x900.jpg`))) encontrado = path.join(base, `${appid}_library_600x900.jpg`);
  cacheArte.set(k, encontrado);
  return encontrado;
}

// ---------- apps ----------
let apps = [];
async function leerApps(forzar) {
  if (!forzar && existsSync(CACHE)) {
    try { apps = JSON.parse(await readFile(CACHE, 'utf8')); } catch { apps = []; }
  }
  if (forzar || !apps.length) {
    await mkdir(DIR_ICONOS, { recursive: true });
    const out = await ps(['-File', path.join(RUTAS.raiz, 'scripts', 'catalogo.ps1'), DIR_ICONOS]);
    try {
      const nuevas = [].concat(JSON.parse(out));
      if (nuevas.length) {
        apps = nuevas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
        await writeFile(CACHE, JSON.stringify(apps));
      }
    } catch { /* se queda la caché */ }
  }
}

// Apps del sistema que no aportan en un lanzador
const RUIDO = /^(component services|computer management|dfrgui|disk cleanup|event viewer|iscsi|memory diagnostics|odbc|performance monitor|recoverydrive|registry editor|resource monitor|security configuration|services|system configuration|system information|task scheduler|windows defender firewall|administrative tools|debuggable package|application verifier|windows app cert|windows software development|steps recorder|character map|run|install additional tools|centro en vivo|magnify|narrator|on-screen keyboard|voiceaccess|livecaptions|obtener ayuda|centro de opiniones|introducción|click to do|family|windows file recovery|copias de seguridad|asistencia rápida)/i;

// ---------- carpetas ----------
let carpetas = [];
async function leerCarpetas() {
  const out = await ps(['-Command', `[Console]::OutputEncoding=[Text.Encoding]::UTF8; $s=New-Object -ComObject Shell.Application; [ordered]@{
    escritorio=[Environment]::GetFolderPath('Desktop'); documentos=[Environment]::GetFolderPath('MyDocuments');
    descargas=$s.NameSpace('shell:Downloads').Self.Path; imagenes=[Environment]::GetFolderPath('MyPictures');
    videos=[Environment]::GetFolderPath('MyVideos'); musica=[Environment]::GetFolderPath('MyMusic') } | ConvertTo-Json -Compress`]);
  let j = {};
  try { j = JSON.parse(out); } catch { /* valores por defecto */ }
  const casa = os.homedir();
  const def = { escritorio: 'Desktop', documentos: 'Documents', descargas: 'Downloads', imagenes: 'Pictures', videos: 'Videos', musica: 'Music' };
  const nombres = { escritorio: 'Escritorio', documentos: 'Documentos', descargas: 'Descargas', imagenes: 'Imágenes', videos: 'Vídeos', musica: 'Música' };
  carpetas = Object.keys(def).map((id) => ({ id, nombre: nombres[id], ruta: path.resolve(j[id] || path.join(casa, def[id])) }))
    .filter((c) => existsSync(c.ruta));
}

const IMAGEN = /\.(jpe?g|png|gif|webp|bmp|avif)$/i;
const VIDEO = /\.(mp4|mkv|mov|webm|avi)$/i;

/** Solo para tests: fija las carpetas conocidas. */
export const fijarCarpetas = (lista) => (carpetas = lista);

/** Resuelve raiz+ruta dentro de una carpeta conocida; null si se sale. */
export function resolver(raiz, ruta = '') {
  const c = carpetas.find((x) => x.id === raiz);
  if (!c) return null;
  const abs = path.resolve(c.ruta, ruta);
  const rel = path.relative(c.ruta, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return abs;
}

export async function listarCarpeta(raiz, ruta = '') {
  const abs = resolver(raiz, ruta);
  if (!abs) throw new Error('Carpeta no permitida');
  const entradas = [];
  for (const e of await readdir(abs, { withFileTypes: true })) {
    if (e.name.startsWith('.') || /^(desktop\.ini|thumbs\.db)$/i.test(e.name)) continue;
    const p = path.join(abs, e.name);
    const st = await stat(p).catch(() => null);
    if (!st) continue;
    const dir = e.isDirectory();
    entradas.push({
      nombre: e.name, ruta: path.relative(resolver(raiz), p).split(path.sep).join('/'),
      tipo: dir ? 'carpeta' : IMAGEN.test(e.name) ? 'imagen' : VIDEO.test(e.name) ? 'video' : 'archivo',
      tam: dir ? null : st.size, fecha: st.mtimeMs,
    });
  }
  entradas.sort((a, b) => (b.tipo === 'carpeta') - (a.tipo === 'carpeta') || b.fecha - a.fecha);
  return entradas.slice(0, 400);
}

/** Fotos recientes de Imágenes (hasta 2 niveles de subcarpetas). */
async function fotosRecientes() {
  const raiz = carpetas.find((c) => c.id === 'imagenes');
  if (!raiz) return [];
  const fotos = [];
  const recorrer = async (d, prof) => {
    for (const e of await readdir(d, { withFileTypes: true }).catch(() => [])) {
      const p = path.join(d, e.name);
      if (e.isDirectory() && prof < 2 && !e.name.startsWith('.')) await recorrer(p, prof + 1);
      else if (e.isFile() && IMAGEN.test(e.name)) {
        const st = await stat(p).catch(() => null);
        if (st) fotos.push({ nombre: e.name, ruta: path.relative(raiz.ruta, p).split(path.sep).join('/'), fecha: st.mtimeMs, tam: st.size, carpeta: path.basename(d) });
      }
    }
  };
  await recorrer(raiz.ruta, 0);
  return fotos.sort((a, b) => b.fecha - a.fecha).slice(0, 120);
}

// ---------- catálogo para el cliente ----------
export async function catalogo(actividadSemana, proyectos) {
  // Favoritas: apps con más tiempo esta semana (cruce por nombre del proceso o de la app)
  const uso = new Map();
  for (const d of actividadSemana) for (const [nombre, a] of Object.entries(d.apps || {})) {
    for (const k of [a.proceso?.toLowerCase(), nombre.toLowerCase()]) if (k) uso.set(k, (uso.get(k) || 0) + a.s);
  }
  const usoDe = (a) => Math.max(uso.get(a.proceso?.toLowerCase()) || 0, uso.get(a.nombre.toLowerCase()) || 0);
  const visibles = apps.filter((a) => !RUIDO.test(a.nombre));
  const lista = visibles.map((a) => ({ id: a.id, nombre: a.nombre, icono: a.icono ? `/api/icono/${a.icono}` : null, tienda: a.carpeta === 'Microsoft Store', usoS: Math.round(usoDe(a)) }));
  // Edge queda fuera: el propio sistema corre dentro de Edge y su tiempo no es «uso».
  const favoritas = [...lista].filter((a) => a.usoS > 60 && !/^microsoft edge$/i.test(a.nombre)).sort((a, b) => b.usoS - a.usoS).slice(0, 10);
  return {
    juegos: juegos.map((j) => ({ ...j, portada: `/api/steam/${j.appid}/portada`, fondo: `/api/steam/${j.appid}/desenfocado`, logo: `/api/steam/${j.appid}/logo` })),
    apps: lista,
    favoritas,
    carpetas: carpetas.map(({ id, nombre }) => ({ id, nombre })),
    fotos: await fotosRecientes(),
    proyectos: proyectos.map((p) => ({ nombre: p.nombre })),
  };
}

// ---------- lanzar ----------
function abrir(objetivo) {
  // explorer.exe abre accesos directos, carpetas, archivos con su app por defecto y URLs steam:// o shell:
  spawn('explorer.exe', [objetivo], { detached: true, stdio: 'ignore', windowsHide: false }).unref();
}

let codeExe = null;
export async function lanzar(pedido, proyectos) {
  const { tipo, id } = pedido || {};
  if (tipo === 'app') {
    const a = apps.find((x) => x.id === id);
    if (!a) throw new Error('App desconocida');
    abrir(a.lnk);
    return a.nombre;
  }
  if (tipo === 'juego') {
    const j = juegos.find((x) => x.id === id);
    if (!j) throw new Error('Juego desconocido');
    abrir(`steam://rungameid/${j.appid}`);
    return j.nombre;
  }
  if (tipo === 'ruta') {
    const abs = resolver(pedido.raiz, pedido.ruta || '');
    if (!abs || !existsSync(abs)) throw new Error('Ruta no permitida');
    abrir(abs);
    return path.basename(abs);
  }
  if (tipo === 'proyecto') {
    const p = proyectos.find((x) => x.nombre === id);
    if (!p) throw new Error('Proyecto desconocido');
    if (!codeExe) {
      const vs = apps.find((a) => /^visual studio code$/i.test(a.nombre));
      codeExe = vs?.destino && existsSync(vs.destino) ? vs.destino : null;
    }
    if (codeExe) spawn(codeExe, [p.dir], { detached: true, stdio: 'ignore' }).unref();
    else abrir(p.dir);
    return p.nombre;
  }
  if (tipo === 'gmail') {
    if (!/^[0-9a-f]{8,24}$/i.test(id || '')) throw new Error('Correo desconocido');
    abrir(`https://mail.google.com/mail/u/0/#all/${id}`);
    return 'Gmail';
  }
  throw new Error('Acción desconocida');
}

// ---------- servir imágenes ----------
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp', '.avif': 'image/avif' };
function enviarArchivo(res, archivo) {
  const tipo = MIME[path.extname(archivo).toLowerCase()];
  if (!tipo) { res.writeHead(415); return res.end(); }
  res.writeHead(200, { 'content-type': tipo, 'cache-control': 'max-age=86400' });
  createReadStream(archivo).on('error', () => res.end()).pipe(res);
}

/** Atiende /api/icono, /api/steam, /api/foto y /api/carpeta. Devuelve true si la ruta era suya. */
export async function atender(url, res) {
  let m = /^\/api\/icono\/([0-9a-f]{16}\.png)$/.exec(url.pathname);
  if (m) {
    const f = path.join(DIR_ICONOS, m[1]);
    if (!existsSync(f)) { res.writeHead(404); res.end(); } else enviarArchivo(res, f);
    return true;
  }
  m = /^\/api\/steam\/(\d+)\/(portada|fondo|desenfocado|logo|cabecera)$/.exec(url.pathname);
  if (m) {
    if (!juegos.some((j) => j.appid === m[1])) { res.writeHead(404); res.end(); return true; }
    const f = await buscarArte(m[1], m[2]);
    if (!f) { res.writeHead(404); res.end(); } else enviarArchivo(res, f);
    return true;
  }
  if (url.pathname === '/api/foto') {
    const abs = resolver(url.searchParams.get('raiz'), url.searchParams.get('ruta') || '');
    if (!abs || !IMAGEN.test(abs) || !existsSync(abs)) { res.writeHead(404); res.end(); } else enviarArchivo(res, abs);
    return true;
  }
  if (url.pathname === '/api/carpeta') {
    try {
      const entradas = await listarCarpeta(url.searchParams.get('raiz'), url.searchParams.get('ruta') || '');
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(JSON.stringify(entradas));
    } catch (e) {
      res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  return false;
}

export async function iniciar() {
  await mkdir(DIR_ICONOS, { recursive: true });
  await Promise.all([leerCarpetas(), leerApps(false), leerSteam().then((j) => (juegos = j))]);
  // Al arrancar se usa la caché de apps; se refresca en segundo plano y cada 30 min.
  setTimeout(() => leerApps(true), 15_000);
  setInterval(() => leerApps(true), 30 * 60 * 1000);
  setInterval(async () => (juegos = await leerSteam()), 5 * 60 * 1000);
}
