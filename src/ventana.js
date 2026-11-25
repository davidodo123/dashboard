// Ventana del sistema: Edge en modo app (sin barra del navegador), a pantalla completa para el sistema de arranque.
import { spawn, exec, execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { RUTAS } from './almacen.js';

export function rutaEdge() {
  const candidatos = [
    process.env['ProgramFiles(x86)'] && path.join(process.env['ProgramFiles(x86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ].filter(Boolean);
  return candidatos.find((c) => existsSync(c)) || null;
}

/** Abre una URL del centro en ventana propia. pantallaCompleta: para el sistema de arranque. */
export function abrirVentana(url, { pantallaCompleta = false } = {}) {
  const edge = rutaEdge();
  if (edge) {
    const args = [`--app=${url}`, pantallaCompleta ? '--start-fullscreen' : '--window-size=1320,900'];
    spawn(edge, args, { detached: true, stdio: 'ignore' }).unref();
  } else {
    exec(`start "" "${url}"`);
  }
}

/** Minimiza la ventana del sistema (al lanzar un juego o una app). */
export function minimizar() {
  execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `
    Add-Type -Name V -Namespace W -MemberDefinition '[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);'
    Get-Process msedge | Where-Object { $_.MainWindowTitle -eq 'Centro' } | ForEach-Object { [W.V]::ShowWindow($_.MainWindowHandle, 6) | Out-Null }`],
  { windowsHide: true }, () => {});
}

/** Tecla global Win+Esc: trae el sistema al frente (o lo abre). */
export function escucharTecla(url) {
  const p = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File',
    path.join(RUTAS.raiz, 'scripts', 'tecla.ps1')], { windowsHide: true });
  p.stdout.setEncoding('utf8');
  p.stdout.on('data', (t) => {
    if (t.includes('abrir')) abrirVentana(url, { pantallaCompleta: true });
    if (t.includes('ocupada')) console.error('[tecla] Win+Esc ya la usa otra app');
  });
  process.on('exit', () => p.kill());
}
