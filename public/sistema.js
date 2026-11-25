// Sistema de arranque: navegación en dos ejes (apartados en horizontal, elementos en vertical, foco fijo).
// Enter lanza o entra; Esc vuelve. Teclado, ratón, rueda y mando. Todo el texto externo pasa por esc().

const $ = (s) => document.querySelector(s);
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const enc = encodeURIComponent;

// ---------- formato ----------
function duracion(s) {
  s = Math.round(s || 0);
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
}
const mb = (n) => (n >= 1024 ? `${(n / 1024).toFixed(1).replace('.', ',')} GB` : `${Math.round(n)} MB`);
function velocidad(b) {
  if (b < 1024) return `${Math.round(b)} B/s`;
  if (b < 1024 ** 2) return `${Math.round(b / 1024)} KB/s`;
  return `${(b / 1024 ** 2).toFixed(1).replace('.', ',')} MB/s`;
}
function hace(ms) {
  if (!ms) return 'nunca';
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ayer' : d < 30 ? `hace ${d} días` : new Date(ms).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}
const tam = (b) => (b == null ? '' : b < 1024 ** 2 ? `${Math.max(1, Math.round(b / 1024))} KB` : b < 1024 ** 3 ? `${(b / 1024 ** 2).toFixed(1).replace('.', ',')} MB` : `${(b / 1024 ** 3).toFixed(1).replace('.', ',')} GB`);
const remitente = (de) => (/^"?([^"<]+?)"?\s*</.exec(de || '')?.[1] || de || '').trim();

// ---------- iconos (trazos propios) ----------
const ICONOS = {
  inicio: '<path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z"/>',
  juegos: '<rect x="3" y="8" width="18" height="10" rx="5"/><path d="M8 11v4M6 13h4"/><circle cx="15.5" cy="12" r="1"/><circle cx="17.5" cy="14.5" r="1"/>',
  apps: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  fotos: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-5 4 4 3-3 4 4"/>',
  carpetas: '<path d="M3.5 7.5a1.5 1.5 0 0 1 1.5-1.5h4.5l2 2H19a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z"/>',
  proyectos: '<path d="M9 8l-4 4 4 4M15 8l4 4-4 4M13 6l-2 12"/>',
  correo: '<rect x="3.5" y="6" width="17" height="12" rx="1.5"/><path d="M4 7l8 6 8-6"/>',
  pc: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M9 20h6M12 16v4"/>',
  buzon: '<path d="M5 5h14v10H9l-4 4z"/>',
  archivo: '<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 6.5 20V4a.5.5 0 0 1 .5-.5z"/><path d="M14 3.5V8h4"/>',
  video: '<rect x="3.5" y="6" width="13" height="12" rx="2"/><path d="M16.5 10.5l4-2.5v8l-4-2.5"/>',
  panel: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M10 10v10"/>',
  ocultar: '<path d="M5 19h14"/><path d="M12 5v10M8 11l4 4 4-4"/>',
  cpu: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>',
  ram: '<rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M7 8v8M11 8v8M15 8v8"/>',
  red: '<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>',
  disco: '<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="12" cy="12" r="3.5"/>',
  procesos: '<path d="M4 17l4-6 4 3 4-8 4 5"/>',
  todas: '<path d="M5 6h14M5 12h14M5 18h14"/>',
  tienda: '<path d="M5 9h14l-1 10H6z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/>',
};
const icono = (n, cls = 'ico') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS[n] || ICONOS.archivo}</svg>`;

const TINTE = {
  inicio: 'var(--acento)', juegos: 'var(--a-juegos)', apps: 'var(--a-programar)', fotos: 'var(--a-multimedia)', carpetas: 'var(--a-multimedia)',
  proyectos: 'var(--a-programar)', correo: 'var(--a-navegar)', pc: '#8d8b84', buzon: '#d55181',
};

async function api(ruta, opciones) {
  const r = await fetch(ruta, opciones);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `${r.status}`);
  return j;
}

// ---------- construir el árbol ----------
const cargados = new Map(); // id -> hijos ya cargados (carpetas), para conservarlos al refrescar

function nodoRuta(raiz, e) {
  const n = {
    id: `ruta:${raiz}:${e.ruta}`, nombre: e.nombre,
    sub: e.tipo === 'carpeta' ? `Carpeta · ${hace(e.fecha)}` : `${tam(e.tam)} · ${hace(e.fecha)}`,
    accion: { tipo: 'ruta', raiz, ruta: e.ruta, etiqueta: e.tipo === 'carpeta' ? 'Abrir en el Explorador' : 'Abrir' },
    detalle: e.tipo === 'imagen' ? 'foto' : 'archivo', datos: { ...e, raiz },
  };
  if (e.tipo === 'carpeta') {
    n.vis = { tipo: 'ico', nombre: 'carpetas' };
    n.cargar = () => api(`/api/carpeta?raiz=${enc(raiz)}&ruta=${enc(e.ruta)}`).then((l) => l.map((x) => nodoRuta(raiz, x)));
    n.abrirCon = n.accion;
    delete n.accion;
  } else if (e.tipo === 'imagen') {
    n.vis = { tipo: 'mini', src: `/api/foto?raiz=${enc(raiz)}&ruta=${enc(e.ruta)}` };
    n.fondo = n.vis.src;
  } else {
    n.vis = { tipo: 'ico', nombre: e.tipo === 'video' ? 'video' : 'archivo' };
  }
  return n;
}

function construir(sis, c, correo) {
  const app = (a) => ({
    id: `app:${a.id}`, nombre: a.nombre, sub: a.usoS > 60 ? `${duracion(a.usoS)} esta semana` : a.tienda ? 'Microsoft Store' : 'App',
    vis: a.icono ? { tipo: 'icono', src: a.icono } : { tipo: 'ico', nombre: 'apps' },
    accion: { tipo: 'app', id: a.id, etiqueta: 'Abrir' }, detalle: 'app', datos: a,
  });
  const juego = (j) => ({
    id: `juego:${j.appid}`, nombre: j.nombre, sub: j.ultimaVez ? `Jugado ${hace(j.ultimaVez)}` : 'Sin jugar todavía',
    vis: { tipo: 'portada', src: j.portada }, fondo: j.fondo, accion: { tipo: 'juego', id: j.id, etiqueta: 'Jugar' }, detalle: 'juego', datos: j,
  });
  const proyectos = c.proyectos.proyectos;
  const tokens = (p) => c.proyectos.tokensHoy.filter((t) => [p.nombre, p.carpeta].map((x) => x.toLowerCase()).includes(t.proyecto.toLowerCase())).reduce((s, t) => s + t.tokens, 0);
  const proyecto = (p) => ({
    id: `proy:${p.nombre}`, nombre: p.nombre, sub: `${p.progreso ?? 0} % · ${p.fase || 'sin pendientes'}`, etiqueta: `${p.progreso ?? 0} %`,
    vis: { tipo: 'ico', nombre: 'proyectos' }, accion: { tipo: 'proyecto', id: p.nombre, etiqueta: 'Abrir en VS Code' }, detalle: 'proyecto',
    datos: { ...p, tokens: tokens(p) },
  });

  const s = c.sistema;
  const act = c.actividad;
  const ultimoJuego = sis.juegos.find((j) => j.ultimaVez);
  const inicio = {
    id: 'inicio', nombre: 'Inicio', icono: 'inicio',
    hijos: [
      ultimoJuego && { ...juego(ultimoJuego), id: 'inicio:juego', nombre: `Seguir con ${ultimoJuego.nombre}` },
      proyectos[0] && { ...proyecto(proyectos[0]), id: 'inicio:proy', nombre: `Seguir con ${proyectos[0].nombre}`, sub: proyectos[0].siguiente ? `Siguiente: ${proyectos[0].siguiente}` : proyecto(proyectos[0]).sub },
      ...sis.favoritas.slice(0, 4).map((a) => ({ ...app(a), id: `inicio:${a.id}` })),
      { id: 'inicio:panel', nombre: 'Panel completo', sub: 'Correo, actividad, proyectos y PC en pestañas', vis: { tipo: 'ico', nombre: 'panel' },
        accion: { tipo: 'navegar', url: '/panel.html', etiqueta: 'Abrir' }, detalle: 'generico',
        campos: [['Qué tiene', 'La vista clásica con todas las tablas y gráficas']] },
      { id: 'inicio:ocultar', nombre: 'Ocultar el sistema', sub: 'Vuelve con Win + Esc', vis: { tipo: 'ico', nombre: 'ocultar' },
        accion: { tipo: 'ocultar', etiqueta: 'Ocultar' }, detalle: 'generico',
        campos: [['Volver', 'Win + Esc desde cualquier app o juego']] },
    ].filter(Boolean),
  };

  const juegos = { id: 'juegos', nombre: 'Juegos', icono: 'juegos', hijos: sis.juegos.map(juego) };
  const steam = sis.apps.find((a) => a.nombre === 'Steam');
  if (steam) juegos.hijos.push({ ...app(steam), id: 'juegos:steam', sub: 'Abrir la biblioteca de Steam' });

  const todas = sis.apps.filter((a) => !a.tienda);
  const tienda = sis.apps.filter((a) => a.tienda);
  const apps = {
    id: 'apps', nombre: 'Apps', icono: 'apps',
    hijos: [
      ...sis.favoritas.map(app),
      { id: 'apps:todas', nombre: 'Todas las apps', sub: `${todas.length} instaladas`, etiqueta: String(todas.length), vis: { tipo: 'ico', nombre: 'todas' }, hijos: todas.map(app), detalle: 'grupo' },
      { id: 'apps:tienda', nombre: 'De la Microsoft Store', sub: `${tienda.length} apps`, etiqueta: String(tienda.length), vis: { tipo: 'ico', nombre: 'tienda' }, hijos: tienda.map(app), detalle: 'grupo' },
    ],
  };

  const fotos = { id: 'fotos', nombre: 'Fotos', icono: 'fotos',
    hijos: sis.fotos.map((f) => ({ ...nodoRuta('imagenes', { ...f, tipo: 'imagen' }), sub: `${f.carpeta} · ${hace(f.fecha)}` })) };

  const carpetas = { id: 'carpetas', nombre: 'Carpetas', icono: 'carpetas',
    hijos: sis.carpetas.map((k) => ({
      id: `ruta:${k.id}:`, nombre: k.nombre, sub: 'Enter para entrar · O para abrir en el Explorador', vis: { tipo: 'ico', nombre: 'carpetas' },
      cargar: () => api(`/api/carpeta?raiz=${enc(k.id)}`).then((l) => l.map((x) => nodoRuta(k.id, x))),
      abrirCon: { tipo: 'ruta', raiz: k.id, ruta: '', etiqueta: 'Abrir en el Explorador' }, detalle: 'archivo', datos: { tipo: 'carpeta', nombre: k.nombre },
    })) };

  const SECS = ['Códigos', 'Importante', 'Académico', 'Banco', 'Amazon', 'Otros'];
  const correoN = { id: 'correo', nombre: 'Correo', icono: 'correo',
    hijos: SECS.map((sec) => {
      const lista = correo.correos.filter((m) => m.seccion === sec);
      return { id: `sec:${sec}`, nombre: sec, sub: `${lista.length} correo${lista.length === 1 ? '' : 's'} en 3 días`, etiqueta: String(lista.length),
        vis: { tipo: 'ico', nombre: 'correo' }, detalle: 'grupo',
        hijos: lista.slice(0, 50).map((m) => ({
          id: `mail:${m.id}`, nombre: m.codigo ? `Código ${m.codigo}` : m.asunto, sub: `${remitente(m.de)} · ${hace(m.fecha)}`,
          vis: { tipo: 'punto', color: 'var(--a-navegar)' }, accion: { tipo: 'gmail', id: m.id, etiqueta: 'Abrir en Gmail' }, detalle: 'generico',
          titulo: m.asunto, texto: m.resumen, campos: [['De', remitente(m.de)], ['Llegó', hace(m.fecha)], ['Tipo', m.subcategoria || sec]],
        })) };
    }) };

  const porNombre = new Map();
  for (const p of [...s.memoria, ...s.procesos]) porNombre.set(p.proceso, p);
  const procesos = [...porNombre.values()].sort((a, b) => b.ramMB - a.ramMB);
  const pc = { id: 'pc', nombre: 'PC', icono: 'pc',
    hijos: [
      { id: 'pc:cpu', nombre: 'Procesador', vivo: 'cpu', vis: { tipo: 'ico', nombre: 'cpu' }, sub: s.equipo.cpu, detalle: 'vivo', campos: [['Modelo', s.equipo.cpu], ['Núcleos', s.equipo.nucleos]] },
      { id: 'pc:ram', nombre: 'Memoria', vivo: 'ram', vis: { tipo: 'ico', nombre: 'ram' }, sub: `${s.ahora.ramTotalGB.toLocaleString('es-ES')} GB`, detalle: 'vivo', campos: [['Total', `${s.ahora.ramTotalGB.toLocaleString('es-ES')} GB`]] },
      { id: 'pc:red', nombre: 'Red', vivo: 'bajada', vis: { tipo: 'ico', nombre: 'red' }, sub: 'Bajada y subida', detalle: 'vivo', campos: [] },
      ...s.discos.map((d) => ({ id: `pc:disco:${d.unidad}`, nombre: `Disco ${d.unidad}`, vis: { tipo: 'ico', nombre: 'disco' }, sub: `${d.libreGB} GB libres de ${d.totalGB} GB`,
        etiqueta: `${Math.round((100 * (d.totalGB - d.libreGB)) / d.totalGB)} %`, progreso: Math.round((100 * (d.totalGB - d.libreGB)) / d.totalGB), detalle: 'generico',
        campos: [['Libre', `${d.libreGB} GB`], ['Total', `${d.totalGB} GB`]] })),
      { id: 'pc:procesos', nombre: 'Procesos', vis: { tipo: 'ico', nombre: 'procesos' }, sub: 'Lo que más memoria ocupa ahora', etiqueta: String(procesos.length), detalle: 'grupo',
        hijos: procesos.map((p) => ({ id: `proc:${p.proceso}`, nombre: p.proceso, sub: `${mb(p.ramMB)} · ${p.cpu.toLocaleString('es-ES')} % CPU · ${p.n} proceso${p.n === 1 ? '' : 's'}`,
          etiqueta: mb(p.ramMB), valor: p.ramMB, vis: { tipo: 'punto', color: 'var(--a-otros)' }, detalle: 'generico',
          campos: [['Memoria', mb(p.ramMB)], ['CPU ahora', `${p.cpu.toLocaleString('es-ES')} %`], ['Instancias', p.n]] })) },
    ] };

  const notas = c.buzon.proyectos.flatMap((b) => [...b.errores.map((e) => ({ tipo: 'Error', p: b.id, ...e })), ...b.ideas.map((i) => ({ tipo: 'Idea', p: b.id, ...i }))])
    .concat(c.buzon.nuevos.map((n) => ({ tipo: 'Proyecto nuevo', p: 'buzón', ...n })));
  const buzon = { id: 'buzon', nombre: 'Buzón', icono: 'buzon',
    hijos: notas.map((n, i) => ({ id: `nota:${i}:${n.fecha}:${(n.titulo || n.texto).slice(0, 20)}`, nombre: n.titulo || n.texto.slice(0, 70), sub: `${n.tipo} · ${n.p}${n.fecha ? ` · ${n.fecha}` : ''}`,
      vis: { tipo: 'punto', color: n.tipo === 'Error' ? '#e66767' : '#d55181' }, detalle: 'generico', texto: n.texto, campos: [['Proyecto', n.p], ['Tipo', n.tipo], ['Apuntada', n.fecha || '—']] })) };

  const proyectosN = { id: 'proyectos', nombre: 'Proyectos', icono: 'proyectos', hijos: proyectos.map(proyecto) };
  const raiz = { id: 'raiz', nombre: 'Centro', hijos: [inicio, juegos, apps, fotos, carpetas, proyectosN, correoN, pc, buzon] };
  // devolver las carpetas ya abiertas
  const recorrer = (n) => { if (cargados.has(n.id)) n.hijos = cargados.get(n.id); (n.hijos || []).forEach(recorrer); };
  recorrer(raiz);
  return raiz;
}

// ---------- estado de navegación (por ids, para sobrevivir a los refrescos) ----------
let raiz = null;
let pila = []; // [{ nodo, hId }]
const foco = {}; // id del padre -> id del hijo con foco
let vivoDatos = null;

const nivel = () => pila.at(-1);
const horizontales = () => nivel().nodo.hijos || [];
const hIndex = () => Math.max(0, horizontales().findIndex((x) => x.id === nivel().hId));
const actual = () => horizontales()[hIndex()];
const verticales = () => actual()?.hijos || [];
const vIndex = () => Math.max(0, verticales().findIndex((x) => x.id === foco[actual()?.id]));
const enfocado = () => verticales()[vIndex()];

function restaurar(nueva) {
  const ids = pila.map((p) => ({ nodo: p.nodo.id, hId: p.hId }));
  raiz = nueva;
  pila = [];
  let padre = raiz;
  for (const n of ids) {
    if (!padre || padre.id !== n.nodo) break;
    pila.push({ nodo: padre, hId: n.hId });
    padre = (padre.hijos || []).find((x) => x.id === n.hId);
  }
  if (!pila.length) pila = [{ nodo: raiz, hId: raiz.hijos[0].id }];
}

// ---------- pintar ----------
function visual(v) {
  if (!v) return '';
  if (v.tipo === 'icono') return `<img class="icono" src="${esc(v.src)}" alt="" loading="lazy" decoding="async">`;
  if (v.tipo === 'portada') return `<img class="portada" src="${esc(v.src)}" alt="" loading="lazy" decoding="async" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'punto',style:'background:var(--a-juegos)'}))">`;
  if (v.tipo === 'mini') return `<img class="mini" src="${esc(v.src)}" alt="" loading="lazy" decoding="async">`;
  if (v.tipo === 'punto') return `<span class="punto" style="background:${v.color}"></span>`;
  return icono(v.nombre);
}

function pintar() {
  if (!raiz) return;
  const h = hIndex();
  const vi = vIndex();
  const lista = verticales();

  $('#ruta').innerHTML = [...pila.map((p) => p.nodo), actual()].filter(Boolean).slice(1)
    .map((n, i, a) => `<span>${i === a.length - 1 ? `<b>${esc(n.nombre)}</b>` : esc(n.nombre)}</span>`).join('');

  // eje horizontal
  const fila = $('#fila');
  fila.innerHTML = horizontales().map((x, i) => `
    <div class="apartado${i === h ? ' foco' : ''}" role="tab" aria-selected="${i === h}" data-h="${i}">
      ${x.icono ? icono(x.icono) : `<span class="inicial">${x.vis?.tipo === 'icono' || x.vis?.tipo === 'portada' || x.vis?.tipo === 'mini' ? `<img src="${esc(x.vis.src)}" alt="">` : esc(x.nombre[0])}</span>`}
      <span class="nom">${esc(x.nombre)}</span>
    </div>`).join('');
  const paso = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--paso-h')) || 172;
  const ejeX = (21 * innerWidth) / 100;
  fila.style.transform = `translateX(${ejeX - h * paso}px)`;
  fila.querySelectorAll('.apartado').forEach((el, i) => {
    const x = ejeX + (i - h) * paso;
    el.style.opacity = x < 30 || x > innerWidth - 80 ? 0 : 1;
  });

  // eje vertical: el elemento con foco queda bajo la cruz; los anteriores suben por encima de la fila
  const col = $('#columna');
  const alto = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--alto-elem')) || 76;
  const desde = Math.max(0, vi - 6);
  const hasta = Math.min(lista.length, vi + 12); // solo se pintan los cercanos
  col.innerHTML = lista.length ? lista.slice(desde, hasta).map((x, k) => {
    const i = desde + k;
    const cls = i === vi ? ' foco' : i < vi ? (vi - i > 2 ? ' lejos' : ' antes') : i > vi + 7 ? ' lejos' : '';
    const n = x.hijos?.length ?? (x.cargar ? '' : null);
    return `<div class="elem${cls}" role="option" aria-selected="${i === vi}" data-v="${i}">
      <span class="vis">${visual(x.vis)}</span>
      <span class="t">${esc(x.nombre)}${n ? `<span class="tiene">${n}</span>` : ''}</span>
      <span class="s">${esc([x.etiqueta && !x.sub?.includes(x.etiqueta) ? x.etiqueta : null, x.sub].filter(Boolean).join(' · '))}</span>
    </div>`;
  }).join('') : '<div class="elem foco"><span class="vis"></span><span class="t">Vacío</span></div>';
  const ejeY = (30 * innerHeight) / 100 + 74 + 26;
  const hueco = vi > 0 ? 130 : 0; // los anteriores saltan por encima de la fila de apartados
  col.querySelectorAll('.elem').forEach((el) => {
    const i = Number(el.dataset.v ?? vi);
    const y = (i - desde) * alto + (i < vi ? -hueco : 0);
    el.style.position = 'absolute';
    el.style.left = '0'; el.style.right = '0';
    el.style.transform = `translateY(${y}px)`;
  });
  col.style.transform = `translateY(${ejeY - (vi - desde) * alto}px)`;

  $('#ambiente').classList.toggle('tapado', vi > 0);
  document.documentElement.style.setProperty('--tinte', TINTE[pila[0].hId] || 'var(--acento)');
  pintarDetalle();
  pintarFondo();
  pintarTeclas();
}

function serie(clave) {
  const vals = (vivoDatos?.historia || []).map((x) => x[clave]);
  if (vals.length < 2) return '';
  const max = clave === 'bajada' ? Math.max(1, ...vals) * 1.1 : 100;
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${(i / (vals.length - 1)) * 100},${40 - (v / max) * 38}`).join('');
  return `<svg class="d-mini" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path d="${d}"/></svg>`;
}

function campos(lista) {
  return lista?.length ? `<dl>${lista.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : '';
}
const accionTxt = (x) => {
  if (x.accion) return `<div class="d-accion"><kbd>Enter</kbd>${esc(x.accion.etiqueta)}</div>`;
  if (x.hijos?.length || x.cargar) return `<div class="d-accion"><kbd>Enter</kbd>Entrar${x.hijos?.length ? ` · ${x.hijos.length} elementos` : ''}</div>`;
  return '';
};

function pintarDetalle() {
  const d = $('#detalle');
  const x = enfocado();
  if (!x) { d.innerHTML = ''; return; }
  const v = vivoDatos?.ahora;
  let html = '';
  if (x.detalle === 'juego') {
    const j = x.datos;
    html = `<div class="d-juego">
      <img class="portada" src="${esc(j.portada)}" alt="Carátula de ${esc(j.nombre)}" onerror="this.style.display='none'">
      <div>
        <img class="logo" src="${esc(j.logo)}" alt="${esc(j.nombre)}" onerror="this.outerHTML='<div class=&quot;d-titulo&quot;>${esc(esc(j.nombre))}</div>'">
        ${campos([['Última vez', j.ultimaVez ? hace(j.ultimaVez) : 'Sin jugar todavía'], ['Ocupa', `${j.tamGB.toLocaleString('es-ES')} GB`], ['Steam', `App ${j.appid}`]])}
        ${accionTxt(x)}
      </div></div>`;
  } else if (x.detalle === 'app') {
    const a = x.datos;
    html = `${a.icono ? `<img class="d-icono" src="${esc(a.icono)}" alt="">` : ''}<div class="d-titulo">${esc(a.nombre)}</div>
      <div class="d-sub">${a.usoS > 60 ? `${duracion(a.usoS)} delante esta semana` : a.tienda ? 'App de la Microsoft Store' : 'Instalada en este PC'}</div>
      ${comparar(x)}${accionTxt(x)}`;
  } else if (x.detalle === 'foto') {
    html = `<img class="d-foto" src="${esc(x.vis.src)}" alt="${esc(x.nombre)}"><div class="d-foto-pie">${esc(x.nombre)} · ${esc(x.sub)}</div>${accionTxt(x)}`;
  } else if (x.detalle === 'archivo') {
    html = `<div class="d-titulo">${esc(x.nombre)}</div><div class="d-sub">${esc(x.sub)}</div>${accionTxt(x)}
      ${x.abrirCon ? `<div class="d-accion" style="margin-left:22px"><kbd>O</kbd>${esc(x.abrirCon.etiqueta)}</div>` : ''}`;
  } else if (x.detalle === 'proyecto') {
    const p = x.datos;
    html = `<div class="d-cifra">${p.progreso ?? 0} %</div><div class="d-sub">${esc(p.nombre)} · ${esc(p.fase || 'sin pendientes')}</div>
      <div class="d-barra" role="img" aria-label="${p.progreso ?? 0} %"><span style="width:${p.progreso ?? 0}%"></span></div>
      ${campos([['Hoy', [p.commitsHoy ? `${p.commitsHoy} commits` : null, p.tokens ? `${(p.tokens / 1e6).toFixed(1).replace('.', ',')} M tokens` : null].filter(Boolean).join(' · ') || 'sin actividad'],
        ['Total', `${p.horas.toLocaleString('es-ES')} h · ${p.commits} commits`],
        ['Último commit', p.ultimoCommit ? `${hace(Date.parse(p.ultimoCommit.fecha))} · ${p.ultimoCommit.mensaje}` : '—'],
        ['Sin subir', p.cambios || p.sinSubir ? `${p.cambios} cambios · ${p.sinSubir ?? '—'} commits` : 'todo subido']])}
      ${p.siguiente ? `<div class="d-nota">Siguiente: ${esc(p.siguiente)}</div>` : ''}
      ${accionTxt(x)}`;
  } else if (x.detalle === 'vivo') {
    const cifra = !v ? '–' : x.vivo === 'bajada' ? velocidad(v.bajada) : `${Math.round(v[x.vivo])} %`;
    html = `<div class="d-cifra">${esc(cifra)}</div><div class="d-sub">${esc(x.nombre)}${x.vivo === 'bajada' && v ? ` · subida ${esc(velocidad(v.subida))}` : x.vivo === 'ram' && v ? ` · ${v.ramUsadaGB.toLocaleString('es-ES')} de ${v.ramTotalGB.toLocaleString('es-ES')} GB` : ''}</div>
      ${serie(x.vivo)}${campos(x.campos)}`;
  } else if (x.detalle === 'grupo') {
    html = `<div class="d-cifra">${esc(x.etiqueta ?? (x.hijos?.length || ''))}</div><div class="d-sub">${esc(x.nombre)} · ${esc(x.sub || '')}</div>${accionTxt(x)}`;
  } else {
    html = `${x.etiqueta ? `<div class="d-cifra">${esc(x.etiqueta)}</div><div class="d-sub">${esc(x.titulo || x.nombre)}</div>` : `<div class="d-titulo">${esc(x.titulo || x.nombre)}</div><div class="d-sub">${esc(x.sub || '')}</div>`}
      ${x.progreso != null ? `<div class="d-barra"><span style="width:${x.progreso}%"></span></div>` : ''}
      ${campos(x.campos)}${x.texto ? `<div class="d-nota">${esc(x.texto)}</div>` : ''}${comparar(x)}${accionTxt(x)}`;
  }
  d.innerHTML = html;
}

function comparar(x) {
  const hermanos = verticales().filter((h) => h.valor || h.datos?.usoS);
  if (hermanos.length < 3 || !hermanos.includes(x)) return '';
  const val = (h) => h.valor ?? h.datos?.usoS ?? 0;
  const max = Math.max(...hermanos.map(val)) || 1;
  return `<div class="d-comparar">${hermanos.slice(0, 8).map((h) => `<div class="${h === x ? 'yo' : ''}"><span>${esc(h.nombre)}</span><i style="width:${Math.max(2, (100 * val(h)) / max)}%"></i></div>`).join('')}</div>`;
}

let fondoActual = null;
let capaFondo = 'a';
function pintarFondo() {
  const url = enfocado()?.fondo || null;
  if (url === fondoActual) return;
  fondoActual = url;
  const siguiente = capaFondo === 'a' ? 'b' : 'a';
  const nueva = $(`#fondo-${siguiente}`);
  const vieja = $(`#fondo-${capaFondo}`);
  if (url) {
    const img = new Image();
    img.onload = () => { if (fondoActual !== url) return; nueva.style.backgroundImage = `url("${url}")`; nueva.classList.add('visible'); vieja.classList.remove('visible'); capaFondo = siguiente; };
    img.src = url;
  } else {
    vieja.classList.remove('visible');
  }
}

function pintarTeclas() {
  const x = enfocado();
  const enter = x?.accion ? x.accion.etiqueta : x?.hijos?.length || x?.cargar ? 'Entrar' : null;
  $('#teclas').innerHTML = `<span><kbd>← →</kbd>Apartado</span><span><kbd>↑ ↓</kbd>Elegir</span>
    ${enter ? `<span><kbd>Enter</kbd>${esc(enter)}</span>` : ''}${x?.abrirCon ? `<span><kbd>O</kbd>Explorador</span>` : ''}
    ${pila.length > 1 ? '<span><kbd>Esc</kbd>Volver</span>' : ''}<span class="derecha"><kbd>Win Esc</kbd>traer el sistema</span>`;
}

function pintarAmbiente() {
  const a = vivoDatos?.actividad;
  const COL = { Programar: 'var(--a-programar)', Navegar: 'var(--a-navegar)', Juegos: 'var(--a-juegos)', Multimedia: 'var(--a-multimedia)', Otros: 'var(--a-otros)' };
  $('#ambiente').innerHTML = a && a.app !== 'Microsoft Edge'
    ? `<span class="punto" style="background:${COL[a.categoria]}"></span>Antes de abrir el sistema estabas en <b>${esc(a.app)}</b>${a.proyecto ? ` · ${esc(a.proyecto)}` : ''}`
    : '';
}

// ---------- acciones ----------
let avisoT;
function avisar(t) {
  const el = $('#aviso');
  el.textContent = t;
  el.hidden = false;
  clearTimeout(avisoT);
  avisoT = setTimeout(() => (el.hidden = true), 2600);
}

async function ejecutar(a) {
  if (!a) return;
  if (a.tipo === 'navegar') { location.href = a.url; return; }
  if (a.tipo === 'ocultar') { await api('/api/ventana', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ accion: 'minimizar' }) }); return; }
  try {
    const r = await api('/api/lanzar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(a) });
    avisar(`Abriendo ${r.nombre}…`);
  } catch (e) {
    avisar(`No se pudo abrir: ${e.message}`);
  }
}

function moverH(d) {
  const lista = horizontales();
  const i = Math.max(0, Math.min(lista.length - 1, hIndex() + d));
  nivel().hId = lista[i].id;
  pintar();
}
function moverV(d) {
  const lista = verticales();
  if (!lista.length) return;
  foco[actual().id] = lista[Math.max(0, Math.min(lista.length - 1, vIndex() + d))].id;
  pintar();
}
async function entrarEn(x) {
  if (x.cargar && !x.hijos) {
    avisar('Cargando…');
    try { x.hijos = await x.cargar(); cargados.set(x.id, x.hijos); } catch (e) { avisar(`No se pudo leer: ${e.message}`); return; }
    $('#aviso').hidden = true;
  }
  if (!x.hijos?.length) { avisar('Está vacía'); return; }
  pila.push({ nodo: actual(), hId: x.id });
  pintar();
}
async function enter() {
  const x = enfocado();
  if (!x) return;
  if (x.accion) return ejecutar(x.accion);
  if (x.hijos?.length || x.cargar) return entrarEn(x);
}
function volver() {
  if (pila.length > 1) { pila.pop(); pintar(); }
}

addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  const f = { ArrowLeft: () => moverH(-1), ArrowRight: () => moverH(1), ArrowUp: () => moverV(-1), ArrowDown: () => moverV(1),
    Enter: enter, Escape: volver, Backspace: volver, Home: () => { pila = [pila[0]]; pila[0].hId = raiz.hijos[0].id; pintar(); },
    o: () => ejecutar(enfocado()?.abrirCon), O: () => ejecutar(enfocado()?.abrirCon) }[e.key];
  if (f) { e.preventDefault(); f(); }
});
let rueda = 0;
addEventListener('wheel', (e) => {
  rueda += e.deltaY;
  if (Math.abs(rueda) > 70) { moverV(Math.sign(rueda)); rueda = 0; }
}, { passive: true });
$('#fila').addEventListener('click', (e) => { const el = e.target.closest('[data-h]'); if (el) { nivel().hId = horizontales()[+el.dataset.h].id; pintar(); } });
$('#columna').addEventListener('click', (e) => {
  const el = e.target.closest('[data-v]'); if (!el) return;
  const i = +el.dataset.v;
  if (i === vIndex()) enter(); else { foco[actual().id] = verticales()[i].id; pintar(); }
});
addEventListener('contextmenu', (e) => { e.preventDefault(); volver(); });

// ---------- mando (Gamepad API) ----------
const repetir = {};
function mando() {
  const g = [...(navigator.getGamepads?.() || [])].find(Boolean);
  if (g) {
    const eje = (i) => g.axes[i] || 0;
    const estados = {
      izq: g.buttons[14]?.pressed || eje(0) < -0.6, der: g.buttons[15]?.pressed || eje(0) > 0.6,
      arr: g.buttons[12]?.pressed || eje(1) < -0.6, aba: g.buttons[13]?.pressed || eje(1) > 0.6,
      a: g.buttons[0]?.pressed, b: g.buttons[1]?.pressed, x: g.buttons[2]?.pressed,
    };
    const accion = { izq: () => moverH(-1), der: () => moverH(1), arr: () => moverV(-1), aba: () => moverV(1), a: enter, b: volver, x: () => ejecutar(enfocado()?.abrirCon) };
    const ahora = performance.now();
    for (const [k, on] of Object.entries(estados)) {
      if (!on) { delete repetir[k]; continue; }
      const r = repetir[k];
      const flecha = ['izq', 'der', 'arr', 'aba'].includes(k);
      if (!r) { accion[k](); repetir[k] = { t: ahora + 380 }; }
      else if (flecha && ahora >= r.t) { accion[k](); r.t = ahora + 110; }
    }
  }
  requestAnimationFrame(mando);
}
addEventListener('gamepadconnected', () => avisar('Mando conectado'));
requestAnimationFrame(mando);

// ---------- datos ----------
let ultimoToque = Date.now();
['keydown', 'wheel', 'click', 'mousemove'].forEach((ev) => addEventListener(ev, () => (ultimoToque = Date.now()), { passive: true }));

async function cargarTodo() {
  const [sis, c, correo] = await Promise.all([api('/api/sistema'), api('/api/centro'), api('/api/estado').catch(() => ({ correos: [] }))]);
  const nueva = construir(sis, c, correo);
  if (!raiz) {
    raiz = nueva;
    pila = [{ nodo: raiz, hId: raiz.hijos[0].id }];
    // #apartado/n abre directamente en un apartado y elemento (accesos directos y capturas)
    const [ap, n] = decodeURIComponent(location.hash.slice(1)).split('/');
    const cat = raiz.hijos.find((x) => x.id === ap);
    if (cat) { pila[0].hId = cat.id; if (cat.hijos?.[+n]) foco[cat.id] = cat.hijos[+n].id; }
  }
  else restaurar(nueva);
  pintar();
}

function reloj() {
  const d = new Date();
  $('#hora').textContent = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  $('#fecha').textContent = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}
setInterval(reloj, 1000);
reloj();

async function tic() {
  try {
    vivoDatos = await api('/api/vivo');
    $('#cpu').textContent = `${Math.round(vivoDatos.ahora.cpu ?? 0)} %`;
    $('#ram').textContent = `${Math.round(vivoDatos.ahora.ram ?? 0)} %`;
    pintarAmbiente();
    if (enfocado()?.detalle === 'vivo') pintarDetalle();
  } catch { /* reintenta */ }
}
setInterval(tic, 2000);
tic();

try {
  await cargarTodo();
} catch (e) {
  $('#cargando').textContent = `No se pudo arrancar: ${e.message}. Reintentando…`;
  await new Promise((r) => setTimeout(r, 3000));
  location.reload();
}
$('#cargando').remove();
// Refresca cuando llevas un rato sin tocar nada (para no moverte la lista mientras navegas).
setInterval(() => { if (Date.now() - ultimoToque > 15_000 && !document.hidden) cargarTodo().catch(() => {}); }, 60_000);
addEventListener('resize', pintar);
