// Buzón: ideas y errores apuntados desde el móvil (repo privado clonado en ~/buzon).
// Solo se lee en local; nada de esto se sube a ningún repo público.
import { execFile } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DIR = path.join(os.homedir(), 'buzon');
const LINEA = /^\s*- \[( |x|X)\]\s*(.*)$/;

function notas(texto) {
  return texto.split(/\r?\n/).map((l) => LINEA.exec(l)).filter(Boolean).map((m) => {
    const resto = m[2].replace(/<!--.*?-->/g, '').replace(/!\[\[[^\]]*\]\]/g, '(foto)').trim();
    const f = /^(\d{4}-\d{2}-\d{2})\s*[—-]\s*/.exec(resto);
    let texto = f ? resto.slice(f[0].length) : resto;
    const titulo = /^\*\*(.+?)\*\*:?\s*/.exec(texto);
    if (titulo) texto = texto.slice(titulo[0].length);
    return { hecha: m[1] !== ' ', fecha: f?.[1] || null, titulo: titulo?.[1] || null, texto: texto.slice(0, 400) };
  });
}

let datos = { proyectos: [], nuevos: [], actualizado: null, error: null };

async function leer() {
  if (!existsSync(DIR)) {
    datos = { ...datos, error: 'No hay buzón en ~/buzon' };
    return;
  }
  const proyectos = [];
  const base = path.join(DIR, 'proyectos');
  for (const e of await readdir(base, { withFileTypes: true }).catch(() => [])) {
    if (!e.isDirectory()) continue;
    const leerNotas = async (f) => notas(await readFile(path.join(base, e.name, f), 'utf8').catch(() => ''));
    const ideas = (await leerNotas('Ideas.md')).filter((n) => !n.hecha);
    const errores = (await leerNotas('Errores.md')).filter((n) => !n.hecha);
    if (ideas.length || errores.length) proyectos.push({ id: e.name, ideas, errores });
  }
  const nuevos = notas(await readFile(path.join(DIR, 'ideas-proyectos.md'), 'utf8').catch(() => '')).filter((n) => !n.hecha);
  datos = { proyectos, nuevos, actualizado: Date.now(), error: null };
}

function actualizar() {
  execFile('git', ['-C', DIR, 'pull', '--quiet'], { windowsHide: true }, () => leer());
}

export function iniciar() {
  actualizar();
  setInterval(actualizar, 15 * 60 * 1000);
}

export const estado = () => datos;
