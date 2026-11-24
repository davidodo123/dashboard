// Instala o quita el arranque automático con Windows.
// Crea un .vbs en la carpeta Inicio del usuario que lanza el servidor sin ventana.
//   node scripts/inicio-windows.js instalar
//   node scripts/inicio-windows.js quitar
import { writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inicio = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
const vbs = path.join(inicio, 'dashboard-correo.vbs');
const servidor = path.join(raiz, 'src', 'servidor.js');

const accion = process.argv[2];

if (accion === 'instalar') {
  const q = (s) => s.replace(/"/g, '""');
  const contenido = [
    'Set s = CreateObject("WScript.Shell")',
    `s.CurrentDirectory = "${q(raiz)}"`,
    `s.Run """${q(process.execPath)}"" ""${q(servidor)}""", 0, False`,
    '',
  ].join('\r\n');
  await writeFile(vbs, contenido);
  console.log(`Arranque instalado: ${vbs}`);
} else if (accion === 'quitar') {
  if (existsSync(vbs)) await rm(vbs);
  console.log('Arranque quitado.');
} else {
  console.log('Uso: node scripts/inicio-windows.js instalar|quitar');
  process.exit(1);
}
