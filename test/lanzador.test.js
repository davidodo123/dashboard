import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { resolver, fijarCarpetas, lanzar } from '../src/lanzador.js';

const base = path.join(os.tmpdir(), 'centro-test', 'Documentos');
fijarCarpetas([{ id: 'documentos', nombre: 'Documentos', ruta: base }]);

test('resolver: rutas dentro de la carpeta', () => {
  assert.equal(resolver('documentos', ''), base);
  assert.equal(resolver('documentos', 'apuntes/tema1.pdf'), path.join(base, 'apuntes', 'tema1.pdf'));
});

test('resolver: no deja salir de la carpeta', () => {
  assert.equal(resolver('documentos', '../../Windows/win.ini'), null);
  assert.equal(resolver('documentos', 'a/../../fuera'), null);
  assert.equal(resolver('documentos', 'C:/Windows/System32'), null);
  assert.equal(resolver('documentos', '\\servidor\compartido'), null);
});

test('resolver: carpeta desconocida', () => {
  assert.equal(resolver('sistema32', ''), null);
});

test('lanzar: solo acepta cosas del catálogo', async () => {
  await assert.rejects(lanzar({ tipo: 'app', id: 'calc.exe' }, []), /App desconocida/);
  await assert.rejects(lanzar({ tipo: 'juego', id: 'steam-1' }, []), /Juego desconocido/);
  await assert.rejects(lanzar({ tipo: 'ruta', raiz: 'documentos', ruta: '../../Windows/System32/calc.exe' }, []), /Ruta no permitida/);
  await assert.rejects(lanzar({ tipo: 'gmail', id: 'javascript:alert(1)' }, []), /Correo desconocido/);
  await assert.rejects(lanzar({ tipo: 'cmd', id: 'whoami' }, []), /Acción desconocida/);
});
