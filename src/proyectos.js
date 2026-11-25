// Proyectos en vivo: tus repos locales con diario/Roadmap.md (la misma marca que el Centro de Operaciones).
// Horas y progreso con las mismas fórmulas que centro-operaciones/actualizar.mjs; tokens de Claude Code de hoy.
import { execFile } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const RAICES = [path.join(os.homedir(), 'Desktop'), os.homedir()];
const MARCA = path.join('diario', 'Roadmap.md');
const EXCLUIR = new Set(['buzon']); // privado, no es un proyecto
const GAP = 2 * 3600; // commits a menos de 2 h = misma sesión
const ARRANQUE = 30 * 60; // cada sesión suma 30 min antes de su primer commit

const git = (args, cwd) => new Promise((ok) =>
  execFile('git', args, { cwd, windowsHide: true, maxBuffer: 20 * 1024 * 1024 }, (err, out) => ok(err ? null : out.trim())));

const fechaLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ---------- fórmulas del Centro de Operaciones ----------

export function horas(isoFechas) {
  const ts = isoFechas.map((s) => ({ t: new Date(s), dia: s.slice(0, 10) })).sort((a, b) => a.t - b.t);
  const dias = {};
  let total = 0;
  let prev;
  for (const { t, dia } of ts) {
    const add = !prev || (t - prev) / 1000 > GAP ? ARRANQUE : (t - prev) / 1000;
    total += add;
    dias[dia] = (dias[dia] ?? 0) + add;
    prev = t;
  }
  return { commits: ts.length, horas: Math.round((total / 3600) * 10) / 10, dias };
}

const CASILLA = /^\s*[-*] \[(.)\]\s*(.*)/;
const limpiar = (txt) => txt
  .replace(/\[\[([^\]|#]*)[^\]]*\]\]/g, '$1')
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/[*_`~]/g, '')
  .replace(/\s+/g, ' ')
  .replace(/^[ →\-—]+|[ →\-—]+$/g, '');

export function roadmap(texto) {
  let fases = [];
  let actual = null;
  let siguiente = null;
  let faseSiguiente = null;
  for (const linea of texto.split(/\r?\n/)) {
    if (linea.startsWith('## ')) {
      let titulo = linea.slice(3).replace(/\[\[.*?\]\]/g, '').split('—')[0].split('→')[0];
      titulo = titulo.replace(/[^\p{L}\p{N}_\s·.,()/:+-]/gu, '').replace(/^[ ·*]+|[ ·*]+$/g, '');
      actual = { fase: titulo, hechas: 0, total: 0 };
      fases.push(actual);
      continue;
    }
    const m = CASILLA.exec(linea);
    if (!m || !actual) continue;
    const c = m[1].toLowerCase();
    if (c === '-') continue;
    actual.total++;
    actual.hechas += c === 'x' ? 1 : c === '/' ? 0.5 : 0;
    if ((c === ' ' || c === '/') && siguiente === null) {
      siguiente = limpiar(m[2].split('—')[0]).slice(0, 160);
      faseSiguiente = actual.fase;
    }
  }
  fases = fases.filter((f) => f.total);
  const h = fases.reduce((s, f) => s + f.hechas, 0);
  const t = fases.reduce((s, f) => s + f.total, 0);
  return { progreso: t ? Math.round((100 * h) / t) : null, hechas: h, total: t, fases, siguiente, fase: faseSiguiente };
}

// ---------- descubrir repos ----------

async function descubrir() {
  const vistos = new Map();
  for (const raiz of RAICES) {
    let entradas = [];
    try { entradas = await readdir(raiz, { withFileTypes: true }); } catch { continue; }
    for (const e of entradas) {
      if (!e.isDirectory() || EXCLUIR.has(e.name.toLowerCase())) continue;
      const dir = path.join(raiz, e.name);
      if (!existsSync(path.join(dir, '.git')) || !existsSync(path.join(dir, MARCA))) continue;
      const remoto = await git(['remote', 'get-url', 'origin'], dir);
      const repo = remoto ? remoto.replace(/\.git$/, '').split(/[/:]/).slice(-2).join('/') : null;
      const nombre = repo ? repo.split('/')[1] : e.name;
      if (!vistos.has(nombre.toLowerCase())) vistos.set(nombre.toLowerCase(), { nombre, carpeta: e.name, dir, repo });
    }
  }
  return [...vistos.values()];
}

async function analizar(p) {
  const hoy = fechaLocal(new Date());
  const [estado, sinSubir, fechas, ultimo, rama, texto] = await Promise.all([
    git(['status', '--porcelain'], p.dir),
    git(['rev-list', '--count', '@{u}..HEAD'], p.dir),
    git(['log', '--all', '--format=%aI'], p.dir),
    git(['log', '-1', '--format=%s%x1f%aI'], p.dir),
    git(['rev-parse', '--abbrev-ref', 'HEAD'], p.dir),
    readFile(path.join(p.dir, MARCA), 'utf8').catch(() => ''),
  ]);
  const h = horas((fechas || '').split(/\s+/).filter(Boolean));
  const [msg, fecha] = (ultimo || '').split('\x1f');
  const r = roadmap(texto);
  return {
    nombre: p.nombre,
    carpeta: p.carpeta,
    repo: p.repo,
    rama,
    cambios: estado ? estado.split('\n').filter(Boolean).length : 0,
    sinSubir: sinSubir == null ? null : Number(sinSubir),
    commits: h.commits,
    horas: h.horas,
    horasHoy: Math.round(((h.dias[hoy] || 0) / 3600) * 10) / 10,
    commitsHoy: (fechas || '').split(/\s+/).filter((s) => s.startsWith(hoy)).length,
    ultimoCommit: fecha ? { mensaje: msg, fecha } : null,
    progreso: r.progreso,
    tareas: { hechas: r.hechas, total: r.total },
    fase: r.fase,
    siguiente: r.siguiente,
    fases: r.fases,
  };
}

// ---------- tokens de Claude Code de hoy ----------

const BASE_CLAUDE = process.env.CLAUDE_CONFIG_DIR ? path.join(process.env.CLAUDE_CONFIG_DIR, 'projects') : path.join(os.homedir(), '.claude', 'projects');
const cacheTokens = new Map(); // fichero -> { clave, filas }

async function tokensHoy(nombres) {
  const hoy = fechaLocal(new Date());
  const conocidos = new Map(nombres.map((n) => [n.toLowerCase(), n]));
  const proyectoDe = (cwd) => {
    if (!cwd) return 'Sin carpeta';
    const partes = String(cwd).split(/[\\/]+/).filter((x) => x && !x.endsWith(':'));
    for (const x of [...partes].reverse()) if (conocidos.has(x.toLowerCase())) return conocidos.get(x.toLowerCase());
    return partes.at(-1) ?? 'Sin carpeta';
  };
  const ficheros = [];
  const recorrer = async (d) => {
    for (const e of await readdir(d, { withFileTypes: true }).catch(() => [])) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) await recorrer(p);
      else if (e.name.endsWith('.jsonl')) ficheros.push(p);
    }
  };
  await recorrer(BASE_CLAUDE);

  const total = new Map();
  for (const f of ficheros) {
    const st = await stat(f).catch(() => null);
    if (!st || fechaLocal(st.mtime) !== hoy) continue; // solo los tocados hoy
    const clave = `${st.mtimeMs}|${st.size}|${hoy}`;
    let filas = cacheTokens.get(f)?.clave === clave ? cacheTokens.get(f).filas : null;
    if (!filas) {
      filas = new Map();
      const vistos = new Set();
      let cwd;
      for (const linea of (await readFile(f, 'utf8')).split('\n')) {
        let r;
        try { r = JSON.parse(linea); } catch { continue; }
        cwd = r?.cwd || cwd;
        const u = r?.message?.usage;
        if (r?.type !== 'assistant' || !u) continue;
        const id = `${r.message.id}|${r.requestId}`;
        if (vistos.has(id)) continue;
        vistos.add(id);
        const t = new Date(String(r.timestamp));
        if (Number.isNaN(t.getTime()) || fechaLocal(t) !== hoy) continue;
        const n = (k) => Number.parseInt(u[k] ?? 0, 10) || 0;
        const p = proyectoDe(r.cwd || cwd);
        const x = filas.get(p) || { tokens: 0, salida: 0, respuestas: 0 };
        x.tokens += n('input_tokens') + n('output_tokens') + n('cache_creation_input_tokens') + n('cache_read_input_tokens');
        x.salida += n('output_tokens');
        x.respuestas += 1;
        filas.set(p, x);
      }
      cacheTokens.set(f, { clave, filas });
    }
    for (const [p, x] of filas) {
      const t = total.get(p) || { tokens: 0, salida: 0, respuestas: 0 };
      t.tokens += x.tokens;
      t.salida += x.salida;
      t.respuestas += x.respuestas;
      total.set(p, t);
    }
  }
  return [...total.entries()].map(([proyecto, x]) => ({ proyecto, ...x })).sort((a, b) => b.tokens - a.tokens);
}

// ---------- ciclo ----------

let lista = [];
let tokens = [];
let calculado = null;
let ocupado = false;
const oyentes = [];
export const alDescubrir = (fn) => oyentes.push(fn);

export async function refrescar() {
  if (ocupado) return;
  ocupado = true;
  try {
    const repos = await descubrir();
    lista = (await Promise.all(repos.map(analizar))).sort((a, b) =>
      (b.ultimoCommit?.fecha || '').localeCompare(a.ultimoCommit?.fecha || ''));
    oyentes.forEach((fn) => fn(lista.flatMap((p) => [p.nombre, p.carpeta])));
    tokens = await tokensHoy(lista.flatMap((p) => [p.nombre, p.carpeta]));
    calculado = Date.now();
  } catch (e) {
    console.error('[proyectos]', e.message);
  } finally {
    ocupado = false;
  }
}

export function iniciar() {
  refrescar();
  setInterval(refrescar, 60_000);
}

export const estado = () => ({ proyectos: lista, tokensHoy: tokens, calculado });
