// Arranque con Windows.
// Crea el acceso directo "Dashboard de correo" en la carpeta Inicio del usuario:
// aparece en Configuración > Aplicaciones > Inicio y en el Administrador de tareas > Aplicaciones de arranque,
// donde se puede activar o desactivar como Opera o Spotify.
// El acceso directo lanza un .vbs que arranca el servidor sin ventana.
//   node scripts/inicio-windows.js instalar
//   node scripts/inicio-windows.js quitar
import { writeFile, rm } from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const NOMBRE = 'Dashboard de correo';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inicio = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
const acceso = path.join(inicio, `${NOMBRE}.lnk`);
const vbsViejo = path.join(inicio, 'dashboard-correo.vbs'); // versión anterior de este script
const lanzador = path.join(raiz, 'data', 'arrancar.vbs');
const servidor = path.join(raiz, 'src', 'servidor.js');
const wscript = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'wscript.exe');

// Pasa valores a PowerShell por variables de entorno: sin problemas de comillas en las rutas.
function powershell(script, env) {
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    env: { ...process.env, ...env },
    stdio: 'inherit',
  });
}

const accion = process.argv[2];

if (accion === 'instalar') {
  mkdirSync(path.dirname(lanzador), { recursive: true });
  const q = (s) => s.replace(/"/g, '""');
  await writeFile(lanzador, [
    "' Lanza el dashboard de correo sin ventana. Lo genera scripts/inicio-windows.js.",
    'Set s = CreateObject("WScript.Shell")',
    `s.CurrentDirectory = "${q(raiz)}"`,
    `s.Run """${q(process.execPath)}"" ""${q(servidor)}""", 0, False`,
    '',
  ].join('\r\n'));

  powershell(
    `$s = (New-Object -ComObject WScript.Shell).CreateShortcut($env:ACCESO);
     $s.TargetPath = $env:WSCRIPT;
     $s.Arguments = '"' + $env:LANZADOR + '"';
     $s.WorkingDirectory = $env:RAIZ;
     $s.Description = 'Clasifica tu Gmail y avisa de códigos e importantes';
     $s.IconLocation = $env:ICONO;
     $s.Save()`,
    {
      ACCESO: acceso, WSCRIPT: wscript, LANZADOR: lanzador, RAIZ: raiz,
      // Icono de sobre de las bibliotecas de Windows.
      ICONO: path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'shell32.dll') + ',156',
    },
  );
  if (existsSync(vbsViejo)) await rm(vbsViejo);
  console.log(`Arranque instalado: "${NOMBRE}" en ${inicio}`);
  console.log('Lo verás en Configuración > Aplicaciones > Inicio y en el Administrador de tareas > Aplicaciones de arranque.');
} else if (accion === 'quitar') {
  await rm(acceso, { force: true });
  await rm(vbsViejo, { force: true });
  console.log('Arranque quitado.');
} else {
  console.log('Uso: node scripts/inicio-windows.js instalar|quitar');
  process.exit(1);
}
