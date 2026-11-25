// Estado del PC en vivo: lanza la sonda de PowerShell, guarda los últimos 5 min de CPU/RAM/red
// y reparte cada muestra a quien se suscriba (actividad.js).
import { spawn, execFile } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { RUTAS } from './almacen.js';

const HISTORIA = 150; // 150 muestras x 2 s = 5 min
const historia = []; // { t, cpu, ram, bajada, subida }
let ultima = null; // última muestra de la sonda
let procesos = [];
let memoria = [];
let discos = [];
let redAntes = null;
let cpuAntes = os.cpus();
const oyentes = [];
const oyentesEvento = [];

export const alMuestrear = (fn) => oyentes.push(fn);
/** Eventos de la sonda: 'abrir' (Win+Esc sin ventana), 'frente', 'tecla-ocupada'. */
export const alEvento = (fn) => oyentesEvento.push(fn);

function cpuTotal() {
  const ahora = os.cpus();
  let ocupado = 0;
  let total = 0;
  ahora.forEach((c, i) => {
    const a = cpuAntes[i]?.times || c.times;
    const t = (k) => c.times[k] - a[k];
    const suma = t('user') + t('nice') + t('sys') + t('irq') + t('idle');
    ocupado += suma - t('idle');
    total += suma;
  });
  cpuAntes = ahora;
  return total ? Math.round((1000 * ocupado) / total) / 10 : 0;
}

function procesar(m) {
  const ram = Math.round((1000 * (os.totalmem() - os.freemem())) / os.totalmem()) / 10;
  let bajada = 0;
  let subida = 0;
  if (redAntes && m.red) {
    const s = (m.t - redAntes.t) / 1000;
    bajada = Math.max(0, (m.red.rx - redAntes.rx) / s);
    subida = Math.max(0, (m.red.tx - redAntes.tx) / s);
  }
  if (m.red) redAntes = { t: m.t, ...m.red };
  historia.push({ t: m.t, cpu: cpuTotal(), ram, bajada: Math.round(bajada), subida: Math.round(subida) });
  if (historia.length > HISTORIA) historia.shift();
  if (m.procesos) procesos = m.procesos;
  if (m.memoria) memoria = m.memoria;
  ultima = m;
  for (const fn of oyentes) {
    try { fn(m); } catch (e) { console.error('[sonda oyente]', e.message); }
  }
}

let sonda = null;
function lanzarSonda() {
  sonda = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File',
    path.join(RUTAS.raiz, 'scripts', 'sonda.ps1')], { windowsHide: true });
  let resto = '';
  sonda.stdout.setEncoding('utf8');
  sonda.stdout.on('data', (trozo) => {
    resto += trozo;
    const lineas = resto.split('\n');
    resto = lineas.pop();
    for (const l of lineas) {
      if (!l.trim()) continue;
      let j;
      try { j = JSON.parse(l); } catch { continue; /* línea rota: se ignora */ }
      if (j.evento) oyentesEvento.forEach((fn) => fn(j.evento));
      else procesar(j);
    }
  });
  sonda.on('exit', () => {
    sonda = null;
    setTimeout(lanzarSonda, 5000); // si se cae, vuelve a arrancar
  });
}

function leerDiscos() {
  execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    'Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | Select-Object DeviceID,VolumeName,Size,FreeSpace | ConvertTo-Json -Compress'],
  { windowsHide: true }, (err, out) => {
    if (err) return;
    try {
      const j = [].concat(JSON.parse(out));
      discos = j.map((d) => ({ unidad: d.DeviceID, nombre: d.VolumeName || '', totalGB: Math.round(d.Size / 1e9), libreGB: Math.round(d.FreeSpace / 1e9) }));
    } catch { /* sin cambios */ }
  });
}

export function iniciar() {
  lanzarSonda();
  leerDiscos();
  setInterval(leerDiscos, 5 * 60 * 1000);
  process.on('exit', () => sonda?.kill());
}

export function estado() {
  const ahora = historia.at(-1) || {};
  return {
    ahora: {
      cpu: ahora.cpu ?? null,
      ram: ahora.ram ?? null,
      ramUsadaGB: Math.round((os.totalmem() - os.freemem()) / 1e8) / 10,
      ramTotalGB: Math.round(os.totalmem() / 1e8) / 10,
      bajada: ahora.bajada ?? 0,
      subida: ahora.subida ?? 0,
      encendidoDesde: Date.now() - os.uptime() * 1000,
    },
    historia,
    procesos,
    memoria,
    discos,
    equipo: { nombre: os.hostname(), cpu: os.cpus()[0]?.model?.trim(), nucleos: os.cpus().length },
  };
}

export const ultimaMuestra = () => ultima;
