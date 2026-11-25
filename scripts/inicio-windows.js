// Arranque con Windows y acceso directo del Centro en vivo.
//   node scripts/inicio-windows.js instalar   -> acceso "Centro en vivo" en Inicio (sale en Aplicaciones de arranque)
//                                                 y "Centro" en el escritorio; ambos abren la ventana propia
//   node scripts/inicio-windows.js quitar     -> quita los dos accesos directos
// El lanzador (data/arrancar.vbs) arranca el servidor sin ventana si no está en marcha, espera a que responda
// y abre el centro en modo app de Edge.
import { writeFile, rm, readFile } from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { rutaEdge } from '../src/ventana.js';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = path.join(raiz, 'data');
const inicio = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
const escritorio = path.join(os.homedir(), 'Desktop');
const accesos = {
  inicio: path.join(inicio, 'Centro en vivo.lnk'),
  escritorio: path.join(escritorio, 'Centro.lnk'),
};
const viejos = [path.join(inicio, 'Dashboard de correo.lnk'), path.join(inicio, 'dashboard-correo.vbs')];
const lanzador = path.join(data, 'arrancar.vbs');
const icono = path.join(data, 'centro.ico');
const servidor = path.join(raiz, 'src', 'servidor.js');
const wscript = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'wscript.exe');
const URL_CENTRO = `http://127.0.0.1:${Number(process.env.PUERTO) || 4321}/`;

function powershell(script, env) {
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { env: { ...process.env, ...env }, stdio: 'inherit' });
}

/** Icono .ico (PNG de 256 px dentro) a partir de public/icono.svg, renderizado con Edge sin ventana. */
async function crearIcono(edge) {
  const html = path.join(data, 'icono.html');
  const png = path.join(data, 'icono.png');
  const svg = await readFile(path.join(raiz, 'public', 'icono.svg'), 'utf8');
  await writeFile(html, `<!doctype html><html><body style="margin:0;background:transparent">${svg.replace('<svg ', '<svg width="256" height="256" ')}</body></html>`);
  execFileSync(edge, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--default-background-color=00000000',
    '--window-size=256,256', `--screenshot=${png}`, pathToFileURL(html).href], { stdio: 'ignore', timeout: 30_000 });
  const p = await readFile(png);
  const cab = Buffer.alloc(22);
  cab.writeUInt16LE(0, 0); cab.writeUInt16LE(1, 2); cab.writeUInt16LE(1, 4); // ICO con 1 imagen
  cab.writeUInt8(0, 6); cab.writeUInt8(0, 7); // 256 x 256
  cab.writeUInt16LE(1, 10); cab.writeUInt16LE(32, 12); // planos, bits
  cab.writeUInt32LE(p.length, 14); cab.writeUInt32LE(22, 18); // tamaño y posición del PNG
  await writeFile(icono, Buffer.concat([cab, p]));
  await rm(html, { force: true });
  await rm(png, { force: true });
}

const q = (s) => s.replace(/"/g, '""');

function vbs(edge) {
  const abrir = edge
    ? `s.Run """${q(edge)}"" --app=" & url & " --start-fullscreen", 1, False`
    : 's.Run url, 1, False';
  return [
    "' Centro en vivo: arranca el servidor si hace falta y abre la ventana. Lo genera scripts/inicio-windows.js.",
    "' Con el argumento /sin-ventana solo arranca el servidor.",
    'Set s = CreateObject("WScript.Shell")',
    `s.CurrentDirectory = "${q(raiz)}"`,
    `url = "${URL_CENTRO}"`,
    'If Not Responde(url & "api/vivo") Then',
    `  s.Run """${q(process.execPath)}"" ""${q(servidor)}""", 0, False`,
    '  For i = 1 To 90',
    '    WScript.Sleep 1000',
    '    If Responde(url & "api/vivo") Then Exit For',
    '  Next',
    'End If',
    'conVentana = True',
    'For Each a In WScript.Arguments',
    '  If LCase(a) = "/sin-ventana" Then conVentana = False',
    'Next',
    `If conVentana Then ${abrir}`,
    '',
    'Function Responde(u)',
    '  Responde = False',
    '  On Error Resume Next',
    '  Set x = CreateObject("MSXML2.ServerXMLHTTP.6.0")',
    '  x.setTimeouts 1000, 1000, 1000, 2000',
    '  x.Open "GET", u, False',
    '  x.Send',
    '  If Err.Number = 0 Then Responde = (x.Status = 200)',
    '  On Error GoTo 0',
    'End Function',
    '',
  ].join('\r\n');
}

function crearAcceso(destino, descripcion) {
  powershell(
    `$s = (New-Object -ComObject WScript.Shell).CreateShortcut($env:ACCESO);
     $s.TargetPath = $env:WSCRIPT;
     $s.Arguments = '"' + $env:LANZADOR + '"';
     $s.WorkingDirectory = $env:RAIZ;
     $s.Description = $env:DESCRIPCION;
     $s.IconLocation = $env:ICONO;
     $s.Save()`,
    { ACCESO: destino, WSCRIPT: wscript, LANZADOR: lanzador, RAIZ: raiz, ICONO: `${icono},0`, DESCRIPCION: descripcion },
  );
}

const accion = process.argv[2];

if (accion === 'instalar') {
  mkdirSync(data, { recursive: true });
  const edge = rutaEdge();
  if (edge) await crearIcono(edge);
  else console.log('No encuentro Microsoft Edge: se abrirá en el navegador normal.');
  await writeFile(lanzador, vbs(edge));
  crearAcceso(accesos.inicio, 'Centro: sistema de arranque a pantalla completa (juegos, apps, carpetas, fotos y proyectos)');
  crearAcceso(accesos.escritorio, 'Abre el Centro a pantalla completa (Win+Esc desde cualquier sitio)');
  for (const v of viejos) await rm(v, { force: true });
  console.log('Instalado:');
  console.log(`  · "Centro en vivo" en Inicio: se abre al encender (Configuración > Aplicaciones > Inicio).`);
  console.log(`  · "Centro" en el escritorio.`);
} else if (accion === 'quitar') {
  for (const f of [...Object.values(accesos), ...viejos]) await rm(f, { force: true });
  console.log('Accesos directos quitados.');
} else {
  console.log('Uso: node scripts/inicio-windows.js instalar|quitar');
  process.exit(1);
}
