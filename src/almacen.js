// Datos locales en data/ (fuera de git): correos, reglas y token.
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(RAIZ, 'data');

export const RUTAS = {
  raiz: RAIZ,
  publico: path.join(RAIZ, 'public'),
  credenciales: path.join(RAIZ, 'credentials.json'),
  token: path.join(DATA, 'token.json'),
  correos: path.join(DATA, 'correos.json'),
  reglas: path.join(DATA, 'reglas.json'),
  reglasEjemplo: path.join(RAIZ, 'reglas.ejemplo.json'),
};

const MAX_CORREOS = 500;

export async function preparar() {
  await mkdir(DATA, { recursive: true });
  if (!existsSync(RUTAS.reglas)) await copyFile(RUTAS.reglasEjemplo, RUTAS.reglas);
}

async function leerJson(ruta, defecto) {
  try {
    return JSON.parse(await readFile(ruta, 'utf8'));
  } catch {
    return defecto;
  }
}

export async function cargarReglas() {
  return (await leerJson(RUTAS.reglas, { reglas: [] })).reglas;
}

export async function guardarReglas(reglas) {
  await writeFile(RUTAS.reglas, JSON.stringify({ reglas }, null, 2));
}

export async function cargarCorreos() {
  return leerJson(RUTAS.correos, []);
}

export async function guardarCorreos(correos) {
  const ordenados = [...correos].sort((a, b) => b.fecha - a.fecha).slice(0, MAX_CORREOS);
  await writeFile(RUTAS.correos, JSON.stringify(ordenados));
  return ordenados;
}
