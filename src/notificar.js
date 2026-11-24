// Notificaciones nativas de Windows (toast) con node-notifier.
import notifier from 'node-notifier';
import { exec } from 'node:child_process';

let urlDashboard = 'http://127.0.0.1:4321';

export function configurar(url) {
  urlDashboard = url;
  notifier.on('click', () => exec(`start "" "${urlDashboard}"`));
}

export function avisar(correo) {
  const titulo = correo.codigo ? `Código: ${correo.codigo}` : `${correo.seccion}: ${remitenteCorto(correo.de)}`;
  notifier.notify({
    title: titulo,
    message: correo.codigo ? `${remitenteCorto(correo.de)} · ${correo.asunto}` : correo.asunto,
    appID: 'Dashboard de correo',
    sound: true,
    wait: true,
  });
}

export function remitenteCorto(de) {
  const m = /^"?([^"<]+?)"?\s*</.exec(de || '');
  return (m ? m[1] : de || '').trim();
}
