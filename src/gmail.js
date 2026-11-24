// Gmail API con OAuth (aplicación de escritorio, redirección loopback). Solo lectura.
import { readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomBytes, createHash } from 'node:crypto';
import { RUTAS } from './almacen.js';

const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const API = 'https://gmail.googleapis.com/gmail/v1/users/me';

let token = null; // { access_token, refresh_token, expires_at }
let pkce = null; // { verifier, state }

async function credenciales() {
  if (!existsSync(RUTAS.credenciales)) return null;
  const json = JSON.parse(await readFile(RUTAS.credenciales, 'utf8'));
  const c = json.installed || json.web;
  return c ? { id: c.client_id, secreto: c.client_secret } : null;
}

export async function estadoAuth() {
  if (!(await credenciales())) return 'sin-credenciales';
  if (!token && existsSync(RUTAS.token)) token = JSON.parse(await readFile(RUTAS.token, 'utf8'));
  return token?.refresh_token ? 'autorizado' : 'sin-autorizar';
}

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function urlAutorizacion(redirect) {
  const c = await credenciales();
  const verifier = base64url(randomBytes(32));
  pkce = { verifier, state: base64url(randomBytes(16)) };
  const p = new URLSearchParams({
    client_id: c.id,
    redirect_uri: redirect,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state: pkce.state,
    code_challenge: base64url(createHash('sha256').update(verifier).digest()),
    code_challenge_method: 'S256',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

async function pedirToken(params) {
  const c = await credenciales();
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: c.id, client_secret: c.secreto, ...params }),
  });
  const j = await r.json();
  if (j.error === 'invalid_grant' || j.error === 'invalid_client') {
    // Permiso revocado o caducado: se olvida el token para que el dashboard pida conectar otra vez.
    token = null;
    await rm(RUTAS.token, { force: true });
    throw new Error('Permiso de Google caducado: vuelve a conectar Gmail');
  }
  if (!r.ok) throw new Error(`Google: ${j.error_description || j.error || r.status}`);
  return j;
}

export async function canjearCodigo(code, state, redirect) {
  if (!pkce || state !== pkce.state) throw new Error('state OAuth no coincide');
  const j = await pedirToken({ grant_type: 'authorization_code', code, redirect_uri: redirect, code_verifier: pkce.verifier });
  pkce = null;
  token = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + j.expires_in * 1000 };
  await writeFile(RUTAS.token, JSON.stringify(token, null, 2));
}

async function accessToken() {
  if (token.expires_at - 60_000 > Date.now()) return token.access_token;
  const j = await pedirToken({ grant_type: 'refresh_token', refresh_token: token.refresh_token });
  token = { ...token, access_token: j.access_token, expires_at: Date.now() + j.expires_in * 1000 };
  await writeFile(RUTAS.token, JSON.stringify(token, null, 2));
  return token.access_token;
}

async function api(ruta) {
  const r = await fetch(`${API}${ruta}`, { headers: { authorization: `Bearer ${await accessToken()}` } });
  if (r.status === 401) {
    token.expires_at = 0; // fuerza refresco en la siguiente vuelta
    throw new Error('Gmail rechazó el acceso; se reintentará');
  }
  if (r.status === 429) throw new Error('Gmail pide ir más despacio; se reintentará');
  if (!r.ok) {
    let msg = String(r.status);
    try { msg = (await r.json()).error?.message || msg; } catch { /* sin cuerpo JSON */ }
    throw new Error(`Gmail: ${msg.slice(0, 120)}`);
  }
  return r.json();
}

/** Ids de los correos recientes de la bandeja de entrada. */
export async function listarRecientes(dias = 3, max = 40) {
  const q = encodeURIComponent(`in:inbox newer_than:${dias}d`);
  const j = await api(`/messages?q=${q}&maxResults=${max}`);
  return (j.messages || []).map((m) => m.id);
}

function decodificar(data) {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function textoDe(payload) {
  // Prefiere text/plain; si no hay, text/html sin etiquetas.
  const partes = [];
  const recorrer = (p) => {
    if (!p) return;
    if (p.body?.data && /^text\/(plain|html)/.test(p.mimeType || '')) partes.push({ tipo: p.mimeType, txt: decodificar(p.body.data) });
    (p.parts || []).forEach(recorrer);
  };
  recorrer(payload);
  const plano = partes.find((x) => x.tipo.startsWith('text/plain'));
  const html = partes.find((x) => x.tipo.startsWith('text/html'));
  const txt = plano
    ? plano.txt
    : (html?.txt || '')
        .replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&');
  return txt.replace(/\s+/g, ' ').trim().slice(0, 3000);
}

/** Descarga un correo y lo reduce a lo que necesita el dashboard. */
export async function leerCorreo(id) {
  const m = await api(`/messages/${id}?format=full`);
  const cab = Object.fromEntries((m.payload?.headers || []).map((h) => [h.name.toLowerCase(), h.value]));
  return {
    id,
    de: cab.from || '',
    asunto: cab.subject || '(sin asunto)',
    fecha: Number(m.internalDate),
    resumen: (m.snippet || '').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
    texto: textoDe(m.payload),
  };
}
