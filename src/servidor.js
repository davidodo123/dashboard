// Centro en vivo: servidor local con correo, actividad, proyectos, estado del PC, buzón y calendario.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { clasificar, SECCIONES } from './clasificar.js';
import * as almacen from './almacen.js';
import * as gmail from './gmail.js';
import * as notificar from './notificar.js';
import * as sistema from './sistema.js';
import * as actividad from './actividad.js';
import * as proyectos from './proyectos.js';
import * as buzon from './buzon.js';
import * as calendario from './calendario.js';

const PUERTO = Number(process.env.PUERTO) || 4321;
const INTERVALO = (Number(process.env.INTERVALO_SEGUNDOS) || 60) * 1000;
const BASE = `http://127.0.0.1:${PUERTO}`;
const REDIRECT = `${BASE}/oauth`;
const ARRANQUE = Date.now();
const VENTANA_AVISO = 10 * 60 * 1000; // al arrancar, solo avisa de lo llegado en los últimos 10 min

let correos = [];
let reglas = [];
let ultimaLectura = null;
let ultimoError = null;
let leyendo = false;

function reclasificar() {
  correos = correos.map((c) => ({ ...c, ...clasificar(c, reglas) }));
}

async function leerGmail() {
  if (leyendo || (await gmail.estadoAuth()) !== 'autorizado') return;
  leyendo = true;
  try {
    const ids = await gmail.listarRecientes();
    const conocidos = new Set(correos.map((c) => c.id));
    const nuevos = [];
    for (const id of ids.filter((i) => !conocidos.has(i))) {
      const c = await gmail.leerCorreo(id);
      nuevos.push({ ...c, ...clasificar(c, reglas) });
    }
    for (const c of nuevos) {
      if (c.notificar && c.fecha > ARRANQUE - VENTANA_AVISO) notificar.avisar(c);
    }
    if (nuevos.length) correos = await almacen.guardarCorreos([...nuevos, ...correos]);
    ultimaLectura = Date.now();
    ultimoError = null;
  } catch (e) {
    ultimoError = e.message;
    console.error('[gmail]', e.message);
  } finally {
    leyendo = false;
  }
}

// ---------- HTTP ----------

function json(res, codigo, datos) {
  res.writeHead(codigo, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(datos));
}

async function cuerpo(req) {
  let d = '';
  for await (const c of req) {
    d += c;
    if (d.length > 10_000) throw new Error('cuerpo demasiado grande');
  }
  return d ? JSON.parse(d) : {};
}

// Evita que otra web abierta en el navegador toque la API local.
function origenLocal(req) {
  const host = req.headers.host || '';
  const origen = req.headers.origin;
  const hostOk = host === `127.0.0.1:${PUERTO}` || host === `localhost:${PUERTO}`;
  const origenOk = !origen || origen === BASE || origen === `http://localhost:${PUERTO}`;
  return hostOk && origenOk;
}

function validarRegla(r) {
  const de = String(r.de || '').trim();
  const asunto = String(r.asunto || '').trim();
  if (!de && !asunto) throw new Error('Pon un remitente o un texto del asunto');
  if (!SECCIONES.includes(r.seccion)) throw new Error('Sección no válida');
  const regla = { seccion: r.seccion };
  if (de) regla.de = de.slice(0, 120);
  if (asunto) regla.asunto = asunto.slice(0, 120);
  if (r.subcategoria) regla.subcategoria = String(r.subcategoria).trim().slice(0, 60);
  if (typeof r.notificar === 'boolean') regla.notificar = r.notificar;
  return regla;
}

const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };

async function estatico(res, ruta) {
  const archivo = path.join(almacen.RUTAS.publico, ruta === '/' ? 'index.html' : ruta);
  if (!archivo.startsWith(almacen.RUTAS.publico)) return json(res, 404, { error: 'no encontrado' });
  try {
    const datos = await readFile(archivo);
    res.writeHead(200, { 'content-type': TIPOS[path.extname(archivo)] || 'application/octet-stream' });
    res.end(datos);
  } catch {
    json(res, 404, { error: 'no encontrado' });
  }
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, BASE);
  try {
    if (!origenLocal(req)) return json(res, 403, { error: 'solo local' });

    if (url.pathname === '/auth') {
      res.writeHead(302, { location: await gmail.urlAutorizacion(REDIRECT) });
      return res.end();
    }
    if (url.pathname === '/oauth') {
      await gmail.canjearCodigo(url.searchParams.get('code'), url.searchParams.get('state'), REDIRECT);
      leerGmail();
      calendario.refrescar();
      res.writeHead(302, { location: '/' });
      return res.end();
    }

    if (url.pathname === '/api/estado' && req.method === 'GET') {
      return json(res, 200, {
        auth: await gmail.estadoAuth(),
        secciones: SECCIONES,
        correos: correos.map(({ texto, ...c }) => c), // el cuerpo completo no hace falta en la UI
        ultimaLectura,
        ultimoError,
      });
    }
    if (url.pathname === '/api/vivo' && req.method === 'GET') {
      const s = sistema.estado();
      return json(res, 200, { ...s, historia: s.historia.slice(-90), actividad: actividad.estado().ahora });
    }
    if (url.pathname === '/api/centro' && req.method === 'GET') {
      const codigos = correos.filter((c) => c.seccion === 'Códigos').slice(0, 3).map(({ texto, ...c }) => c);
      const porSeccion = Object.fromEntries(SECCIONES.map((s) => [s, correos.filter((c) => c.seccion === s).length]));
      return json(res, 200, {
        sistema: sistema.estado(),
        actividad: actividad.estado(),
        semana: await actividad.semana(),
        proyectos: proyectos.estado(),
        buzon: buzon.estado(),
        calendario: calendario.estado(),
        correo: { auth: await gmail.estadoAuth(), porSeccion, codigos, ultimaLectura, ultimoError,
          amazon: correos.filter((c) => c.seccion === 'Amazon' && c.subcategoria === 'Devolución').length },
      });
    }
    if (url.pathname === '/api/refrescar' && req.method === 'POST') {
      await leerGmail();
      return json(res, 200, { ok: true });
    }
    if (url.pathname === '/api/reglas' && req.method === 'GET') return json(res, 200, reglas);
    if (url.pathname === '/api/reglas' && req.method === 'POST') {
      const regla = validarRegla(await cuerpo(req));
      reglas = [regla, ...reglas]; // la nueva tiene prioridad
      await almacen.guardarReglas(reglas);
      reclasificar();
      correos = await almacen.guardarCorreos(correos);
      return json(res, 200, reglas);
    }
    const borrar = /^\/api\/reglas\/(\d+)$/.exec(url.pathname);
    if (borrar && req.method === 'DELETE') {
      reglas = reglas.filter((_, i) => i !== Number(borrar[1]));
      await almacen.guardarReglas(reglas);
      reclasificar();
      correos = await almacen.guardarCorreos(correos);
      return json(res, 200, reglas);
    }

    if (req.method === 'GET') return estatico(res, url.pathname);
    json(res, 404, { error: 'no encontrado' });
  } catch (e) {
    json(res, 400, { error: e.message });
  }
});

await almacen.preparar();
reglas = await almacen.cargarReglas();
correos = await almacen.cargarCorreos();
reclasificar();
notificar.configurar(BASE);
await actividad.iniciar();
sistema.alMuestrear(actividad.muestra);
proyectos.alDescubrir(actividad.fijarProyectos);

servidor.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.log(`Ya hay un dashboard abierto en ${BASE}`);
    process.exit(0);
  }
  throw e;
});
servidor.listen(PUERTO, '127.0.0.1', () => {
  console.log(`Dashboard de correo en ${BASE}`);
  leerGmail();
  setInterval(leerGmail, INTERVALO);
  sistema.iniciar();
  proyectos.iniciar();
  buzon.iniciar();
  calendario.iniciar();
});
