// Centro en vivo: pestañas Hoy · Proyectos · PC (el correo lo pinta app.js).
// Todo el texto que viene de fuera (títulos, nombres, notas) se pinta con textContent.

const $ = (s) => document.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';

function h(tag, props = {}, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of hijos.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
function svg(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

// Categorías de actividad: color fijo por categoría (paleta validada, mismo orden siempre).
const CATEGORIA = {
  Programar: '--a-programar', Navegar: '--a-navegar', Juegos: '--a-juegos', Multimedia: '--a-multimedia', Otros: '--a-otros',
};
const colorCat = (c) => `var(${CATEGORIA[c] || '--a-otros'})`;

// ---------- formato ----------
function duracion(s) {
  s = Math.round(s || 0);
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `${hh} h ${mm} min` : `${hh} h`;
}
const horaCorta = (ms) => new Date(ms).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
function hace(ms) {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const hh = Math.round(m / 60);
  if (hh < 24) return `hace ${hh} h`;
  const d = Math.round(hh / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}
function velocidad(bps) {
  if (bps < 1024) return `${Math.round(bps)} B/s`;
  if (bps < 1024 ** 2) return `${(bps / 1024).toFixed(0)} KB/s`;
  return `${(bps / 1024 ** 2).toFixed(1).replace('.', ',')} MB/s`;
}
const millones = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace('.', ',')} M` : `${Math.round(n / 1e3)} mil`);

// ---------- tooltip compartido ----------
const tip = $('#tooltip');
function mostrarTip(x, y, texto) {
  tip.textContent = texto;
  tip.style.left = `${Math.min(Math.max(x, 90), innerWidth - 90)}px`;
  tip.style.top = `${y}px`;
  tip.hidden = false;
}
const ocultarTip = () => (tip.hidden = true);
function conTip(el, texto) {
  const ver = () => { const r = el.getBoundingClientRect(); mostrarTip(r.left + r.width / 2, r.top, texto); };
  el.addEventListener('mouseenter', ver);
  el.addEventListener('focus', ver);
  el.addEventListener('mouseleave', ocultarTip);
  el.addEventListener('blur', ocultarTip);
  return el;
}

async function api(ruta) {
  const r = await fetch(ruta);
  if (!r.ok) throw new Error(r.status);
  return r.json();
}

// ---------- gráfica de líneas (PC) ----------
function grafica(cont, series, { max, formato, alto = 120 }) {
  const n = Math.max(...series.map((s) => s.valores.length), 2);
  const tope = max ?? Math.max(1, ...series.flatMap((s) => s.valores)) * 1.15;
  const ancho = 300;
  const x = (i) => (i / (n - 1)) * ancho;
  const y = (v) => alto - 4 - (v / tope) * (alto - 8);
  const s = svg('svg', { viewBox: `0 0 ${ancho} ${alto}`, preserveAspectRatio: 'none', class: 'svg-grafica', role: 'img',
    'aria-label': series.map((se) => `${se.nombre}: ${formato(se.valores.at(-1) ?? 0)} ahora`).join(', ') });
  for (const f of [0.25, 0.5, 0.75]) s.append(svg('line', { x1: 0, x2: ancho, y1: y(tope * f), y2: y(tope * f), class: 'rejilla-linea' }));
  for (const se of series) {
    if (!se.valores.length) continue;
    const d = se.valores.map((v, i) => `${i ? 'L' : 'M'}${x(i + n - se.valores.length).toFixed(1)},${y(v).toFixed(1)}`).join('');
    if (series.length === 1) s.append(svg('path', { d: `${d}L${ancho},${alto}L${x(n - se.valores.length)},${alto}Z`, class: 'area', style: `fill: ${se.color}` }));
    s.append(svg('path', { d, class: 'linea', style: `stroke: ${se.color}` }));
  }
  const cruz = svg('line', { y1: 0, y2: alto, class: 'cruz', visibility: 'hidden' });
  s.append(cruz);
  s.addEventListener('mousemove', (ev) => {
    const r = s.getBoundingClientRect();
    const i = Math.round(((ev.clientX - r.left) / r.width) * (n - 1));
    cruz.setAttribute('x1', x(i)); cruz.setAttribute('x2', x(i)); cruz.setAttribute('visibility', 'visible');
    const segs = Math.round((n - 1 - i) * 2);
    const texto = series.map((se) => `${se.nombre} ${formato(se.valores[i - (n - se.valores.length)] ?? 0)}`).join(' · ');
    mostrarTip(ev.clientX, r.top, `${texto} · hace ${segs} s`);
  });
  s.addEventListener('mouseleave', () => { cruz.setAttribute('visibility', 'hidden'); ocultarTip(); });
  cont.replaceChildren(s);
}

function minilinea(valores, color) {
  const n = Math.max(valores.length, 2);
  const tope = Math.max(1, ...valores) * 1.1;
  const s = svg('svg', { viewBox: '0 0 100 28', preserveAspectRatio: 'none', class: 'svg-mini', 'aria-hidden': 'true' });
  const d = valores.map((v, i) => `${i ? 'L' : 'M'}${((i / (n - 1)) * 100).toFixed(1)},${(26 - (v / tope) * 24).toFixed(1)}`).join('');
  if (valores.length) s.append(svg('path', { d, class: 'linea', style: `stroke: ${color}` }));
  return s;
}

// ---------- estado ----------
let centro = null;
let vivo = null;
let vista = 'hoy';

// ---------- HOY ----------
function pintarAhora() {
  const a = vivo?.actividad;
  const caja = $('#ahora-app');
  if (!a) {
    caja.replaceChildren(h('p', { class: 'vacio' }, 'Sin actividad: llevas más de 2 min sin tocar el teclado ni el ratón.'));
  } else {
    caja.replaceChildren(
      h('div', { class: 'ahora-linea' }, h('span', { class: 'marca-color', style: `--c: ${colorCat(a.categoria)}` }), h('span', { class: 'ahora-cat' }, a.categoria)),
      h('p', { class: 'ahora-nombre' }, a.app),
      h('p', { class: 'ahora-sub' }, a.proyecto ? `Proyecto ${a.proyecto} · ` : '', `desde hace ${duracion((Date.now() - a.desde) / 1000)}`),
    );
  }
  const hist = vivo?.historia || [];
  const ah = vivo?.ahora || {};
  const metrica = (nombre, valor, valores, color, irA) =>
    h('a', { class: 'mini', href: '#pc', title: `Ver ${nombre} en la pestaña PC` },
      h('span', { class: 'mini-nombre' }, nombre), h('b', {}, valor), minilinea(valores, color));
  $('#ahora-pc').replaceChildren(
    metrica('CPU', ah.cpu == null ? '–' : `${Math.round(ah.cpu)} %`, hist.map((x) => x.cpu), 'var(--acento)'),
    metrica('RAM', ah.ram == null ? '–' : `${Math.round(ah.ram)} %`, hist.map((x) => x.ram), 'var(--acento)'),
    metrica('Red', velocidad(ah.bajada || 0), hist.map((x) => x.bajada), 'var(--acento)'),
  );
}

function pintarTiempoHoy() {
  const act = centro.actividad;
  $('#hoy-total').replaceChildren(h('b', {}, duracion(act.totalS)), act.totalS ? ' activo' : '');
  const filas = act.categorias.filter((c) => c.s > 0);
  const barra = $('#hoy-barra');
  barra.setAttribute('aria-label', filas.map((c) => `${c.categoria}: ${duracion(c.s)}`).join(', ') || 'Sin actividad todavía');
  barra.replaceChildren(...(filas.length ? filas : [{ categoria: 'Otros', s: 1, vacio: true }]).map((c) => {
    const pct = Math.round((100 * c.s) / (act.totalS || 1));
    const b = h('button', { class: 'segmento', type: 'button', style: `flex:${c.s} 1 0; --c: ${c.vacio ? 'var(--hundido)' : colorCat(c.categoria)}`,
      'aria-label': c.vacio ? 'Sin actividad' : `${c.categoria}: ${duracion(c.s)} (${pct} %)` });
    return c.vacio ? b : conTip(b, `${c.categoria}: ${duracion(c.s)} (${pct} %)`);
  }));
  $('#hoy-leyenda').replaceChildren(...act.categorias.map((c) =>
    h('li', {}, h('span', { class: 'leyenda-item' }, h('span', { class: 'marca-color', style: `--c: ${colorCat(c.categoria)}` }), c.categoria, ' ', h('b', {}, duracion(c.s))))));
}

function pintarLineaDia() {
  const act = centro.actividad;
  const cont = $('#linea-dia');
  const ahora = Date.now();
  const inicioDia = new Date(); inicioDia.setHours(0, 0, 0, 0);
  const tramos = act.tramos || [];
  if (!tramos.length) {
    cont.replaceChildren(h('p', { class: 'vacio' }, 'Todavía no hay actividad registrada hoy. Se empieza a contar en cuanto usas el PC con el centro abierto.'));
    $('#apps-hoy').replaceChildren();
    return;
  }
  // Eje desde la hora en punto anterior a la primera actividad hasta ahora.
  const ini = new Date(tramos[0][0]); ini.setMinutes(0, 0, 0);
  const a = Math.max(ini.getTime(), inicioDia.getTime());
  const total = ahora - a;
  const pista = h('div', { class: 'pista-dia' });
  for (const [t0, t1, cat, app] of tramos) {
    if (t1 < a) continue;
    const izq = ((Math.max(t0, a) - a) / total) * 100;
    const anc = Math.max(((t1 - Math.max(t0, a)) / total) * 100, 0.25);
    pista.append(conTip(h('span', { class: 'tramo', tabindex: '0', style: `left:${izq}%;width:${anc}%;--c:${colorCat(cat)}`,
      'aria-label': `${cat}, ${app}, de ${horaCorta(t0)} a ${horaCorta(t1)}` }),
      `${cat} · ${app} · ${horaCorta(t0)}–${horaCorta(t1)}`));
  }
  const eje = h('div', { class: 'eje-dia', 'aria-hidden': 'true' });
  const horasEje = Math.ceil(total / 3600e3);
  const paso = horasEje > 12 ? 3 : horasEje > 6 ? 2 : 1;
  for (let t = a; t <= ahora; t += paso * 3600e3) {
    const pos = ((t - a) / total) * 100;
    if (pos > 90) break; // deja sitio a la etiqueta "ahora"
    eje.append(h('span', { style: `left:${pos}%` }, horaCorta(t)));
  }
  eje.append(h('span', { class: 'eje-ahora', style: 'left:100%' }, 'ahora'));
  cont.replaceChildren(pista, eje);

  const max = act.apps[0]?.s || 1;
  $('#apps-hoy').replaceChildren(...act.apps.slice(0, 8).map((x) =>
    h('li', {},
      h('span', { class: 'app-nombre' }, h('span', { class: 'marca-color', style: `--c: ${colorCat(x.categoria)}` }), x.nombre),
      h('span', { class: 'app-barra' }, h('span', { style: `width:${(x.s / max) * 100}%; background:${colorCat(x.categoria)}` })),
      h('span', { class: 'app-tiempo' }, duracion(x.s)))));
}

function pintarAgenda() {
  const c = centro.calendario;
  const caja = $('#agenda');
  if (c.estado === 'sin-permiso') {
    caja.replaceChildren(
      h('p', { class: 'vacio' }, 'Para ver tus eventos, da permiso de lectura del calendario. Te pedirá volver a elegir tu cuenta de Google.'),
      h('a', { class: 'boton', href: '/auth' }, 'Conectar Google Calendar'));
    return;
  }
  if (c.estado === 'sin-api') {
    caja.replaceChildren(h('p', { class: 'vacio' }, 'Falta activar la ', h('b', {}, 'Google Calendar API'),
      ' en tu proyecto de Google Cloud (Biblioteca → Google Calendar API → Habilitar). Después se carga sola en 5 min.'));
    return;
  }
  if (c.estado === 'error') {
    caja.replaceChildren(h('p', { class: 'error' }, `No se pudo leer el calendario: ${c.error}`));
    return;
  }
  const manana = new Date(); manana.setHours(24, 0, 0, 0);
  const proximos = c.eventos.filter((e) => new Date(e.fin) > new Date());
  if (!proximos.length) {
    caja.replaceChildren(h('p', { class: 'vacio' }, 'Nada más en tu calendario hoy ni mañana.'));
    return;
  }
  caja.replaceChildren(h('ul', { class: 'eventos' }, ...proximos.slice(0, 6).map((e) => {
    const d = new Date(e.inicio);
    const esManana = d >= manana;
    const enCurso = !e.todoElDia && d <= new Date();
    return h('li', { class: enCurso ? 'en-curso' : '' },
      h('span', { class: 'evento-hora' }, e.todoElDia ? 'Todo el día' : horaCorta(d), esManana ? h('small', {}, 'mañana') : null),
      h('span', { class: 'evento-titulo' }, e.titulo, enCurso ? h('small', {}, 'ahora') : null),
      e.lugar ? h('span', { class: 'evento-lugar' }, e.lugar) : null);
  })));
}

function etiquetasProyecto(p) {
  const tags = [];
  if (p.cambios) tags.push(h('span', { class: 'etiqueta aviso-etq' }, `${p.cambios} cambio${p.cambios === 1 ? '' : 's'} sin commit`));
  if (p.sinSubir) tags.push(h('span', { class: 'etiqueta aviso-etq' }, `${p.sinSubir} commit${p.sinSubir === 1 ? '' : 's'} sin subir`));
  if (p.sinSubir == null && p.repo == null) tags.push(h('span', { class: 'etiqueta' }, 'sin GitHub'));
  return tags;
}

function barraProgreso(pct) {
  return h('span', { class: 'progreso', role: 'img', 'aria-label': `${pct ?? 0} % hecho` }, h('span', { style: `width:${pct ?? 0}%` }));
}

function tokensDe(p) {
  const t = centro.proyectos.tokensHoy.filter((x) => [p.nombre, p.carpeta].map((s) => s.toLowerCase()).includes(x.proyecto.toLowerCase()));
  return t.reduce((s, x) => s + x.tokens, 0);
}
function tiempoVSCode(p) {
  return centro.actividad.proyectos.filter((x) => [p.nombre, p.carpeta].includes(x.proyecto)).reduce((s, x) => s + x.s, 0);
}

function pintarProyectosHoy() {
  const lista = centro.proyectos.proyectos;
  // Primero los que se han movido hoy, luego por último commit.
  const actividadHoy = (p) => p.commitsHoy * 1e6 + tiempoVSCode(p) + tokensDe(p) / 1e3;
  const orden = [...lista].sort((a, b) => actividadHoy(b) - actividadHoy(a));
  $('#proyectos-hoy').replaceChildren(...(orden.length ? orden.slice(0, 6) : []).map((p) => {
    const hoy = [];
    if (p.commitsHoy) hoy.push(`${p.commitsHoy} commit${p.commitsHoy === 1 ? '' : 's'}`);
    const vs = tiempoVSCode(p);
    if (vs >= 60) hoy.push(`${duracion(vs)} en VS Code`);
    const tk = tokensDe(p);
    if (tk) hoy.push(`${millones(tk)} tokens`);
    return h('li', {},
      h('div', { class: 'proy-cab' },
        h('a', { class: 'proy-nombre', href: '#proyectos' }, p.nombre),
        h('span', { class: 'proy-pct' }, p.progreso == null ? '–' : `${p.progreso} %`)),
      barraProgreso(p.progreso),
      h('p', { class: 'proy-hoy' }, hoy.length ? `Hoy: ${hoy.join(' · ')}` : `Último commit ${p.ultimoCommit ? hace(Date.parse(p.ultimoCommit.fecha)) : '—'}`),
      etiquetasProyecto(p).length ? h('div', { class: 'etiquetas' }, etiquetasProyecto(p)) : null);
  }));
  if (!orden.length) $('#proyectos-hoy').replaceChildren(h('li', { class: 'vacio' }, 'Buscando repos con diario/Roadmap.md…'));
}

function pintarPendiente() {
  const items = [];
  const c = centro.correo;
  for (const cod of c.codigos.filter((x) => Date.now() - x.fecha < 15 * 60e3)) {
    items.push(h('li', { class: 'pend' }, h('span', { class: 'pend-tipo' }, 'Código'),
      h('span', {}, h('code', {}, cod.codigo), ` de ${(/^"?([^"<]+?)"?\s*</.exec(cod.de)?.[1] || cod.de).trim()}`),
      h('a', { class: 'enlace', href: '#correo' }, 'Ver')));
  }
  if (c.amazon) items.push(h('li', { class: 'pend' }, h('span', { class: 'pend-tipo' }, 'Amazon'),
    h('span', {}, `${c.amazon} ${c.amazon === 1 ? 'devolución' : 'devoluciones'} en curso`), h('a', { class: 'enlace', href: '#correo' }, 'Ver')));
  if (c.porSeccion?.Importante) items.push(h('li', { class: 'pend' }, h('span', { class: 'pend-tipo' }, 'Correo'),
    h('span', {}, `${c.porSeccion.Importante} correo${c.porSeccion.Importante === 1 ? '' : 's'} importante${c.porSeccion.Importante === 1 ? '' : 's'}`), h('a', { class: 'enlace', href: '#correo' }, 'Ver')));
  for (const p of centro.proyectos.proyectos) {
    if (p.sinSubir) items.push(h('li', { class: 'pend' }, h('span', { class: 'pend-tipo' }, 'Git'),
      h('span', {}, `${p.nombre}: ${p.sinSubir} commit${p.sinSubir === 1 ? '' : 's'} sin subir (el panel no se entera)`)));
  }
  for (const b of centro.buzon.proyectos) {
    for (const e of b.errores) items.push(h('li', { class: 'pend' }, h('span', { class: 'pend-tipo error-tipo' }, 'Error'), h('span', {}, h('b', {}, b.id), ` · ${e.titulo ? e.titulo + ': ' : ''}${e.texto}`)));
    for (const i of b.ideas) items.push(h('li', { class: 'pend' }, h('span', { class: 'pend-tipo' }, 'Idea'), h('span', {}, h('b', {}, b.id), ` · ${i.titulo ? i.titulo + ': ' : ''}${i.texto}`)));
  }
  for (const n of centro.buzon.nuevos) items.push(h('li', { class: 'pend' }, h('span', { class: 'pend-tipo' }, 'Proyecto'), h('span', {}, n.titulo ? h('b', {}, n.titulo) : null, n.titulo ? ` · ${n.texto}` : n.texto)));
  $('#pendiente').replaceChildren(...(items.length ? items : [h('li', { class: 'vacio' }, 'Nada pendiente: sin códigos recientes, sin commits por subir y el buzón al día.')]));
}

function pintarSemana() {
  const dias = centro.semana;
  const max = Math.max(1, ...dias.map((d) => d.categorias.reduce((s, c) => s + c.s, 0)));
  $('#semana').replaceChildren(...dias.map((d) => {
    const total = d.categorias.reduce((s, c) => s + c.s, 0);
    const fecha = new Date(`${d.fecha}T12:00`);
    const etiqueta = fecha.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
    const col = h('div', { class: 'semana-col' },
      h('span', { class: 'semana-total' }, total ? duracion(total) : ''),
      h('div', { class: 'semana-pila', style: `height:${(total / max) * 100}%` },
        ...d.categorias.filter((c) => c.s > 0).reverse().map((c) =>
          conTip(h('span', { tabindex: '0', style: `flex:${c.s} 1 0; background:${colorCat(c.categoria)}`, 'aria-label': `${etiqueta}, ${c.categoria}: ${duracion(c.s)}` }),
            `${etiqueta} · ${c.categoria}: ${duracion(c.s)}`))),
      h('span', { class: 'semana-dia' }, etiqueta));
    return col;
  }));
  $('#semana-leyenda').replaceChildren(...Object.keys(CATEGORIA).map((c) =>
    h('li', {}, h('span', { class: 'leyenda-item' }, h('span', { class: 'marca-color', style: `--c: ${colorCat(c)}` }), c))));
}

// ---------- PROYECTOS ----------
function pintarProyectos() {
  const lista = centro.proyectos.proyectos;
  const hoyCommits = lista.reduce((s, p) => s + p.commitsHoy, 0);
  const tokens = centro.proyectos.tokensHoy.reduce((s, x) => s + x.tokens, 0);
  $('#proyectos-resumen').replaceChildren(
    h('b', {}, `${lista.length} proyectos`), ` en tu PC · hoy `, h('b', {}, `${hoyCommits} commit${hoyCommits === 1 ? '' : 's'}`),
    ' y ', h('b', {}, `${millones(tokens)} tokens`), ' de Claude Code.');
  const buzonDe = (p) => centro.buzon.proyectos.find((b) => [p.nombre, p.carpeta].map((s) => s.toLowerCase()).includes(b.id));
  $('#proyectos-tarjetas').replaceChildren(...lista.map((p) => {
    const b = buzonDe(p);
    const vs = tiempoVSCode(p);
    const tk = tokensDe(p);
    return h('article', { class: 'tarjeta proyecto' },
      h('div', { class: 'cabecera' },
        h('h2', { class: 'titulo' }, p.nombre),
        p.repo ? h('a', { class: 'enlace', href: `https://github.com/${p.repo}`, target: '_blank', rel: 'noopener' }, 'GitHub') : null),
      h('div', { class: 'proy-cab' }, h('span', { class: 'proy-fase' }, p.fase || 'Sin tareas pendientes'), h('span', { class: 'proy-pct' }, p.progreso == null ? '–' : `${p.progreso} %`)),
      barraProgreso(p.progreso),
      h('p', { class: 'proy-tareas' }, `${String(p.tareas.hechas).replace('.', ',')} de ${p.tareas.total} tareas del Roadmap`),
      p.siguiente ? h('p', { class: 'proy-siguiente' }, h('span', {}, 'Siguiente'), p.siguiente) : null,
      h('dl', { class: 'proy-datos' },
        h('div', {}, h('dt', {}, 'Hoy'), h('dd', {}, [p.commitsHoy ? `${p.commitsHoy} commits` : null, vs >= 60 ? `${duracion(vs)} en VS Code` : null, tk ? `${millones(tk)} tokens` : null].filter(Boolean).join(' · ') || 'Sin actividad')),
        h('div', {}, h('dt', {}, 'Total'), h('dd', {}, `${p.horas.toLocaleString('es-ES')} h · ${p.commits} commits`)),
        h('div', {}, h('dt', {}, 'Último commit'), h('dd', { title: p.ultimoCommit?.mensaje || '' }, p.ultimoCommit ? `${hace(Date.parse(p.ultimoCommit.fecha))} · ${p.ultimoCommit.mensaje}` : '—')),
        h('div', {}, h('dt', {}, 'Rama'), h('dd', {}, p.rama || '—'))),
      etiquetasProyecto(p).length ? h('div', { class: 'etiquetas' }, etiquetasProyecto(p)) : null,
      b ? h('p', { class: 'proy-buzon' }, `Buzón: ${b.errores.length} error${b.errores.length === 1 ? '' : 'es'} y ${b.ideas.length} idea${b.ideas.length === 1 ? '' : 's'} pendientes`) : null);
  }));
}

// ---------- PC ----------
function pintarPC() {
  const s = vivo;
  if (!s) return;
  const hist = s.historia;
  $('#cpu-ahora').replaceChildren(h('b', {}, s.ahora.cpu == null ? '–' : `${Math.round(s.ahora.cpu)} %`), ` de ${s.equipo.nucleos} núcleos`);
  grafica($('#graf-cpu'), [{ nombre: 'CPU', valores: hist.map((x) => x.cpu), color: 'var(--acento)' }], { max: 100, formato: (v) => `${Math.round(v)} %` });
  $('#ram-ahora').replaceChildren(h('b', {}, `${s.ahora.ramUsadaGB.toLocaleString('es-ES')} GB`), ` de ${s.ahora.ramTotalGB.toLocaleString('es-ES')} GB`);
  grafica($('#graf-ram'), [{ nombre: 'RAM', valores: hist.map((x) => x.ram), color: 'var(--acento)' }], { max: 100, formato: (v) => `${Math.round(v)} %` });
  $('#red-ahora').replaceChildren(h('b', {}, velocidad(s.ahora.bajada)), ` bajada · ${velocidad(s.ahora.subida)} subida`);
  grafica($('#graf-red'), [
    { nombre: 'Bajada', valores: hist.map((x) => x.bajada), color: 'var(--a-programar)' },
    { nombre: 'Subida', valores: hist.map((x) => x.subida), color: 'var(--a-navegar)' },
  ], { formato: velocidad });
  $('#red-leyenda').replaceChildren(
    h('li', {}, h('span', { class: 'leyenda-item' }, h('span', { class: 'marca-color', style: '--c: var(--a-programar)' }), 'Bajada')),
    h('li', {}, h('span', { class: 'leyenda-item' }, h('span', { class: 'marca-color', style: '--c: var(--a-navegar)' }), 'Subida')));

  const tabla = (el, filas, cols) => el.replaceChildren(
    h('thead', {}, h('tr', {}, ...cols.map((c) => h('th', { scope: 'col', class: c.num ? 'num' : '' }, c.t)))),
    h('tbody', {}, ...filas.map((f) => h('tr', {}, ...cols.map((c) => h('td', { class: c.num ? 'num' : '' }, c.v(f)))))));
  tabla($('#tabla-cpu'), s.procesos.slice(0, 8), [
    { t: 'Proceso', v: (p) => p.n > 1 ? `${p.proceso} (${p.n})` : p.proceso },
    { t: 'CPU', num: true, v: (p) => `${p.cpu.toLocaleString('es-ES')} %` },
    { t: 'Memoria', num: true, v: (p) => `${p.ramMB.toLocaleString('es-ES')} MB` }]);
  tabla($('#tabla-ram'), s.memoria.slice(0, 8), [
    { t: 'Proceso', v: (p) => p.n > 1 ? `${p.proceso} (${p.n})` : p.proceso },
    { t: 'Memoria', num: true, v: (p) => `${p.ramMB.toLocaleString('es-ES')} MB` }]);

  $('#discos').replaceChildren(...s.discos.map((d) => {
    const usado = d.totalGB - d.libreGB;
    const pct = Math.round((100 * usado) / d.totalGB);
    return h('li', {},
      h('div', { class: 'proy-cab' }, h('b', {}, `${d.unidad} ${d.nombre}`), h('span', {}, `${d.libreGB} GB libres de ${d.totalGB} GB`)),
      h('span', { class: `progreso${pct > 90 ? ' lleno' : ''}`, role: 'img', 'aria-label': `${pct} % usado` }, h('span', { style: `width:${pct}%` })));
  }));
  $('#equipo').replaceChildren(
    h('div', {}, h('dt', {}, 'Nombre'), h('dd', {}, s.equipo.nombre)),
    h('div', {}, h('dt', {}, 'Procesador'), h('dd', {}, s.equipo.cpu)),
    h('div', {}, h('dt', {}, 'Encendido'), h('dd', {}, `${hace(s.ahora.encendidoDesde).replace('hace ', 'hace ')} (${new Date(s.ahora.encendidoDesde).toLocaleString('es-ES', { weekday: 'short', hour: '2-digit', minute: '2-digit' })})`)));
}

// ---------- navegación y ciclo ----------
function irA(nueva) {
  vista = ['hoy', 'correo', 'proyectos', 'pc'].includes(nueva) ? nueva : 'hoy';
  document.querySelectorAll('.vista').forEach((v) => (v.hidden = v.dataset.vista !== vista));
  document.querySelectorAll('[data-ir]').forEach((a) => a.toggleAttribute('aria-current', a.dataset.ir === vista));
  if (vista === 'correo') $('#estado').hidden = false; else $('#estado').hidden = true;
  pintarTodo();
}
addEventListener('hashchange', () => irA(location.hash.slice(1)));

function pintarTodo() {
  if (vista === 'hoy') {
    if (vivo) pintarAhora();
    if (centro) { pintarTiempoHoy(); pintarLineaDia(); pintarAgenda(); pintarProyectosHoy(); pintarPendiente(); pintarSemana(); }
  } else if (vista === 'proyectos' && centro) pintarProyectos();
  else if (vista === 'pc') pintarPC();
}

async function cargarCentro() {
  try { centro = await api('/api/centro'); pintarTodo(); } catch { /* el servidor puede estar arrancando */ }
}
async function cargarVivo() {
  if (document.hidden || !['hoy', 'pc'].includes(vista)) return;
  try {
    vivo = await api('/api/vivo');
    if (vista === 'hoy') pintarAhora(); else pintarPC();
  } catch { /* reintenta en la siguiente vuelta */ }
}

$('#refrescar').addEventListener('click', () => setTimeout(cargarCentro, 500));
irA(location.hash.slice(1) || 'hoy');
cargarVivo();
cargarCentro();
setInterval(cargarVivo, 2000);
setInterval(cargarCentro, 30_000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { cargarVivo(); cargarCentro(); } });
