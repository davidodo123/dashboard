// Abre el centro en una ventana propia (modo app de Edge: sin barra del navegador, icono propio en la barra de tareas).
import { spawn, exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

export function rutaEdge() {
  const candidatos = [
    process.env['ProgramFiles(x86)'] && path.join(process.env['ProgramFiles(x86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ].filter(Boolean);
  return candidatos.find((c) => existsSync(c)) || null;
}

export function abrirVentana(url) {
  const edge = rutaEdge();
  if (edge) {
    spawn(edge, [`--app=${url}`, '--window-size=1320,900'], { detached: true, stdio: 'ignore', windowsHide: false }).unref();
  } else {
    exec(`start "" "${url}"`);
  }
}
