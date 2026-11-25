// Google Calendar: eventos de hoy y mañana del calendario principal (solo lectura).
import * as google from './gmail.js';

let datos = { estado: 'sin-permiso', eventos: [], error: null, actualizado: null };

async function leer() {
  if (!(await google.tienePermiso('calendario'))) {
    datos = { ...datos, estado: 'sin-permiso', eventos: [] };
    return;
  }
  const ini = new Date();
  ini.setHours(0, 0, 0, 0);
  const fin = new Date(ini.getTime() + 2 * 864e5);
  const q = new URLSearchParams({
    timeMin: ini.toISOString(), timeMax: fin.toISOString(),
    singleEvents: 'true', orderBy: 'startTime', maxResults: '30',
  });
  try {
    const j = await google.getGoogle(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${q}`);
    datos = {
      estado: 'ok',
      error: null,
      actualizado: Date.now(),
      eventos: (j.items || []).filter((e) => e.status !== 'cancelled').map((e) => ({
        titulo: e.summary || '(sin título)',
        inicio: e.start?.dateTime || e.start?.date,
        fin: e.end?.dateTime || e.end?.date,
        todoElDia: Boolean(e.start?.date && !e.start?.dateTime),
        lugar: e.location || null,
        enlace: e.hangoutLink || null,
      })),
    };
  } catch (e) {
    // 403 "has not been used / is disabled": falta activar la Calendar API en Google Cloud.
    const sinApi = e.status === 403 && /not been used|disabled|accessNotConfigured/i.test(e.message);
    datos = { ...datos, estado: sinApi ? 'sin-api' : 'error', error: e.message };
  }
}

export function iniciar() {
  leer();
  setInterval(leer, 5 * 60 * 1000);
}

export const refrescar = leer;
export const estado = () => datos;
