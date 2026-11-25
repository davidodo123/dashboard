import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categoria, proyectoDeTitulo, fijarProyectos } from '../src/actividad.js';
import { horas, roadmap } from '../src/proyectos.js';

test('categoría por proceso', () => {
  assert.equal(categoria('Code'), 'Programar');
  assert.equal(categoria('WindowsTerminal'), 'Programar');
  assert.equal(categoria('opera'), 'Navegar');
  assert.equal(categoria('chrome'), 'Navegar');
  assert.equal(categoria('steam'), 'Juegos');
  assert.equal(categoria('Spotify'), 'Multimedia');
  assert.equal(categoria('explorer'), 'Otros');
});

test('proyecto desde el título de VS Code', () => {
  fijarProyectos(['dashboard', 'StatsRun', 'Eat-em']);
  assert.equal(proyectoDeTitulo('Code', 'app.js - dashboard - Visual Studio Code'), 'dashboard');
  assert.equal(proyectoDeTitulo('Code', '● Roadmap.md - StatsRun - Visual Studio Code'), 'StatsRun');
  assert.equal(proyectoDeTitulo('Code', 'Bienvenida - Visual Studio Code'), null);
  assert.equal(proyectoDeTitulo('chrome', 'dashboard - Google Chrome'), null); // solo editores
});

test('horas: sesiones de commits como el Centro de Operaciones', () => {
  // 3 commits en 1 h (misma sesión: 30 min de arranque + 60 min) y otro 5 h después (nueva sesión: 30 min).
  const h = horas(['2026-11-25T10:00:00+01:00', '2026-11-25T10:30:00+01:00', '2026-11-25T11:00:00+01:00', '2026-11-25T16:00:00+01:00']);
  assert.equal(h.commits, 4);
  assert.equal(h.horas, 2);
});

test('roadmap: progreso, fase y siguiente tarea', () => {
  const r = roadmap(`# Roadmap
## Fase 1 · Necesario — terminada 2026-11-20
- [x] Uno
- [x] Dos
## Fase 2 · Importante
- [/] Tres a medias
- [ ] Cuatro
- [-] ~~Descartada~~
`);
  assert.equal(r.progreso, 63); // 2,5 de 4
  assert.equal(r.fase, 'Fase 2 · Importante');
  assert.equal(r.siguiente, 'Tres a medias');
});
