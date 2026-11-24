// Dashboard de correo (cliente). Todo el texto de los correos se pinta con textContent.

const $ = (s) => document.querySelector(s);
let datos = { correos: [], secciones: [] };
let reglas = [];
let cursoActivo = 'Todos';

// Orden fijo y color fijo por sección (mismo orden que la paleta validada).
const SECCION = {
  'Códigos': { var: '--s-codigos', destino: '#t-codigo' },
  'Importante': { var: '--s-importante', destino: '#sec-importante' },
  'Académico': { var: '--s-academico', destino: '#sec-academico' },
  'Banco': { var: '--s-banco', destino: '#sec-banco' },
  'Otros': { var: '--s-otros', destino: '#sec-otros' },
};
const CODIGO_FRESCO_MIN = 15;

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

const remitente = (de) => (/^"?([^"<]+?)"?\s*</.exec(de || '')?.[1] || de || '').trim();
const direccion = (de) => (/<([^>]+)>/.exec(de || '')?.[1] || de || '').trim().toLowerCase();

/** Dominio "raíz": email.decathlon.es -> decathlon.es, accounts.google.com -> google.com */
function dominio(de) {
  const d = direccion(de).split('@')[1] || direccion(de);
  const partes = d.split('.');
  const dobles = ['co.uk', 'com.es', 'org.es', 'com.mx', 'com.ar'];
  const n = dobles.includes(partes.slice(-2).join('.')) ? 3 : 2;
  return partes.slice(-n).join('.');
}

function iniciales(de) {
  const nombre = remitente(de).replace(/[^\p{L}\p{N} ]/gu, '').trim();
  const p = nombre.split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] || '?') + (p[1]?.[0] || '')).toUpperCase();
}

function hora(ms) {
  const d = new Date(ms);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function haceCuanto(ms) {
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const horas = Math.round(min / 60);
  return horas < 24 ? `hace ${horas} h` : hora(ms);
}

async function api(ruta, opciones = {}) {
  const r = await fetch(ruta, { headers: { 'content-type': 'application/json' }, ...opciones });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || r.status);
  return j;
}

async function crearRegla(regla) {
  reglas = await api('/api/reglas', { method: 'POST', body: JSON.stringify(regla) });
  await cargar();
}

// ---------- tooltip ----------

const tip = $('#tooltip');
function mostrarTip(el, texto) {
  const r = el.getBoundingClientRect();
  tip.textContent = texto;
  tip.style.left = `${Math.min(Math.max(r.left + r.width / 2, 80), innerWidth - 80)}px`;
  tip.style.top = `${r.top}px`;
  tip.hidden = false;
}
const ocultarTip = () => (tip.hidden = true);

// ---------- piezas ----------

function botonCopiar(codigo, clase = 'boton') {
  const b = h('button', { class: clase, type: 'button', 'aria-label': `Copiar código ${codigo}` }, 'Copiar');
  b.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      b.textContent = 'Copiado';
    } catch {
      b.textContent = 'No se pudo copiar';
    }
    setTimeout(() => (b.textContent = 'Copiar'), 1500);
  });
  return b;
}

function itemCorreo(c, extra) {
  return h('li', { class: 'correo' },
    h('span', { class: 'avatar', 'aria-hidden': 'true' }, iniciales(c.de)),
    h('span', { class: 'de', title: c.de }, remitente(c.de)),
    extra || h('span', { class: 'hora' }, hora(c.fecha)),
    h('span', { class: 'asunto', title: c.asunto }, c.asunto),
    c.resumen ? h('span', { class: 'resumen-correo' }, c.resumen) : null,
  );
}

function lista(el, items, vacio) {
  el.replaceChildren(...(items.length ? items : [h('li', {}, h('span', { class: 'vacio' }, ...[].concat(vacio)))]));
}

// ---------- secciones ----------

function pintarCodigos(codigos) {
  const [ultimo, ...resto] = codigos;
  const caja = $('#codigo-principal');
  if (!ultimo) {
    caja.replaceChildren(h('p', { class: 'vacio' }, 'Ningún código en los últimos 3 días. Cuando llegue uno saldrá aquí y en una notificación.'));
    $('#codigos-anteriores').replaceChildren();
    return;
  }
  const fresco = Date.now() - ultimo.fecha < CODIGO_FRESCO_MIN * 60000;
  caja.replaceChildren(
    h('div', { class: `codigo-grande${fresco ? '' : ' caducado'}` },
      h('span', { class: 'valor' }, ultimo.codigo),
      h('div', { class: 'pie' },
        h('div', { class: 'origen' },
          h('b', {}, remitente(ultimo.de)),
          h('span', {}, `${haceCuanto(ultimo.fecha)}${fresco ? '' : ' · probablemente caducado'}`)),
        botonCopiar(ultimo.codigo, fresco ? 'boton primario' : 'boton')),
    ),
  );
  $('#codigos-anteriores').replaceChildren(...resto.slice(0, 4).map((c) =>
    h('li', {},
      h('code', {}, c.codigo),
      h('span', { class: 'de' }, remitente(c.de)),
      h('span', { class: 'hora' }, haceCuanto(c.fecha)),
      botonCopiar(c.codigo, 'boton mini'))));
}

function pintarReparto(por, total) {
  const ruido = por['Otros'].length;
  const frase = $('#frase');
  if (!total) frase.replaceChildren('Sin correos en los últimos 3 días.');
  else if (ruido / total >= 0.5) frase.replaceChildren(h('b', {}, `${ruido} de ${total}`), ' correos son ruido sin clasificar.');
  else frase.replaceChildren(h('b', {}, `${total - ruido} de ${total}`), ' correos ya están en su sección.');

  const filas = datos.secciones.map((s) => ({ s, n: por[s].length })).filter((f) => f.n);
  const barra = $('#barra');
  barra.setAttribute('aria-label', filas.map((f) => `${f.s}: ${f.n}`).join(', ') || 'Sin correos');
  barra.replaceChildren(...filas.map(({ s, n }) => {
    const pct = Math.round((n / total) * 100);
    const texto = `${s}: ${n} correo${n === 1 ? '' : 's'} (${pct} %)`;
    return h('button', {
      class: 'segmento', type: 'button', 'aria-label': texto,
      style: `flex:${n} 1 0; --c: var(${SECCION[s].var})`,
      onmouseenter: (e) => mostrarTip(e.currentTarget, texto), onmouseleave: ocultarTip,
      onfocus: (e) => mostrarTip(e.currentTarget, texto), onblur: ocultarTip,
      onclick: () => irA(s),
    });
  }));
  $('#leyenda').replaceChildren(...datos.secciones.map((s) =>
    h('li', {}, h('button', { type: 'button', onclick: () => irA(s) },
      h('span', { class: 'marca-color', style: `--c: var(${SECCION[s].var})` }), s, ' ', h('b', {}, por[s].length)))));
}

function irA(seccion) {
  document.querySelector(SECCION[seccion].destino)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function pintarAcademico(academicos) {
  const cursos = ['Todos', ...new Set(academicos.map((c) => c.subcategoria || 'Sin curso'))];
  if (!cursos.includes(cursoActivo)) cursoActivo = 'Todos';
  $('#cursos').replaceChildren(...(academicos.length ? cursos : []).map((curso) =>
    h('button', { class: 'chip', role: 'tab', type: 'button', 'aria-selected': String(curso === cursoActivo),
      onclick: () => { cursoActivo = curso; pintar(); } }, curso)));
  const filtrados = cursoActivo === 'Todos' ? academicos : academicos.filter((c) => (c.subcategoria || 'Sin curso') === cursoActivo);
  lista($('#academico'), filtrados.slice(0, 30).map((c) => itemCorreo(c)),
    ['Nada de Moodle ni Ilerna en 3 días. Si usan otro remitente, añádelo en ', h('b', {}, 'Reglas'), '.']);
}

function numero(importe) {
  const n = Number((importe || '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function pintarBanco(banco) {
  const conImporte = banco.filter((c) => c.importe);
  const total = conImporte.reduce((s, c) => s + numero(c.importe), 0);
  $('#total-banco').textContent = conImporte.length
    ? `${total.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € en ${conImporte.length} movimiento${conImporte.length === 1 ? '' : 's'}`
    : '';
  lista($('#banco'), banco.slice(0, 30).map((c) =>
    itemCorreo(c, h('span', { class: 'importe' }, c.importe || hora(c.fecha)))),
    'Sin tickets de Santander en 3 días.');
}

function pintarRuido(otros) {
  $('#n-otros').textContent = otros.length;
  const grupos = new Map();
  for (const c of otros) {
    const d = dominio(c.de);
    const g = grupos.get(d) || { dominio: d, n: 0, nombres: new Map() };
    g.n++;
    const nom = remitente(c.de);
    g.nombres.set(nom, (g.nombres.get(nom) || 0) + 1);
    grupos.set(d, g);
  }
  const top = [...grupos.values()].sort((a, b) => b.n - a.n).slice(0, 10);
  const max = top[0]?.n || 1;
  const destinos = datos.secciones.filter((s) => s !== 'Otros');

  lista($('#remitentes'), top.map((g) => {
    const nombre = [...g.nombres.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const sel = h('select', { 'aria-label': `Sección para ${g.dominio}` },
      h('option', { value: '' }, 'Mover a…'), ...destinos.map((s) => h('option', { value: s }, s)));
    const boton = h('button', { class: 'boton mini', type: 'button', disabled: true }, 'Mover');
    sel.addEventListener('change', () => (boton.disabled = !sel.value));
    boton.addEventListener('click', async () => {
      boton.disabled = true;
      try { await crearRegla({ de: g.dominio, seccion: sel.value, notificar: sel.value === 'Importante' }); }
      catch (e) { boton.textContent = e.message; }
    });
    return h('li', { class: 'remitente' },
      h('span', { class: 'nombre', title: g.dominio }, nombre, h('span', { class: 'hora' }, ` · ${g.dominio}`)),
      h('span', { class: 'pista-bar' },
        h('span', { class: 'bar', style: `width:${(g.n / max) * 100}%` }),
        h('span', { class: 'n' }, g.n)),
      h('span', { class: 'mover' }, sel, boton));
  }), 'Nada sin clasificar. Bandeja limpia.');

  lista($('#otros'), otros.slice(0, 80).map((c) => itemCorreo(c)), 'Vacío.');
}

function pintarReglas() {
  lista($('#reglas'), reglas.map((r, i) => h('li', {},
    h('span', {},
      r.de ? h('code', {}, r.de) : null, r.de && r.asunto ? '+' : null, r.asunto ? h('code', {}, `asunto: ${r.asunto}`) : null,
      '→', h('span', { class: 'marca-color', style: `--c: var(${SECCION[r.seccion]?.var || '--s-otros'})` }),
      h('b', {}, r.seccion), r.subcategoria ? `· ${r.subcategoria}` : null, r.notificar ? '· avisa' : null),
    h('button', { class: 'boton mini', type: 'button', 'aria-label': `Quitar regla ${r.de || r.asunto}`, onclick: async () => {
      reglas = await api(`/api/reglas/${i}`, { method: 'DELETE' });
      await cargar();
    } }, 'Quitar'),
  )), 'Sin reglas todavía.');
}

function pintar() {
  const por = Object.fromEntries(datos.secciones.map((s) => [s, []]));
  for (const c of datos.correos) (por[c.seccion] || por['Otros']).push(c);
  pintarCodigos(por['Códigos']);
  pintarReparto(por, datos.correos.length);
  lista($('#importante'), por['Importante'].slice(0, 30).map((c) => itemCorreo(c)),
    'Nada importante. Marca remitentes como Importante desde «Quién te llena la bandeja».');
  pintarAcademico(por['Académico']);
  pintarBanco(por['Banco']);
  pintarRuido(por['Otros']);
  pintarReglas();
}

function pintarEstado() {
  const e = $('#estado');
  e.classList.toggle('mal', Boolean(datos.ultimoError));
  e.title = datos.ultimoError || '';
  e.textContent = datos.ultimoError
    ? `Error: ${datos.ultimoError}`
    : datos.ultimaLectura ? `Actualizado ${haceCuanto(datos.ultimaLectura)}` : 'Leyendo Gmail…';
}

function pintarConfigurar(auth) {
  const el = $('#configurar');
  el.hidden = auth === 'autorizado';
  $('#panel').hidden = auth !== 'autorizado';
  $('#refrescar').hidden = auth !== 'autorizado';
  if (auth === 'sin-credenciales') {
    el.replaceChildren(
      h('h2', {}, 'Falta conectar con Google'),
      h('ol', {},
        h('li', {}, 'Entra en console.cloud.google.com, crea un proyecto y activa la ', h('b', {}, 'Gmail API'), '.'),
        h('li', {}, 'En «Pantalla de consentimiento OAuth» elige Externo, déjala en Prueba y añade tu Gmail como usuario de prueba.'),
        h('li', {}, 'En «Clientes» crea un ', h('b', {}, 'ID de cliente OAuth'), ' de tipo ', h('b', {}, 'App de escritorio'), '.'),
        h('li', {}, 'Descarga el JSON y guárdalo como ', h('code', {}, 'credentials.json'), ' en la carpeta del proyecto.'),
        h('li', {}, 'Recarga esta página.'),
      ),
    );
  } else if (auth === 'sin-autorizar') {
    el.replaceChildren(
      h('h2', {}, 'Conecta tu Gmail'),
      h('p', {}, 'Solo lectura: la app no puede borrar ni enviar correos. El permiso se guarda en tu PC.'),
      h('a', { class: 'boton primario', href: '/auth' }, 'Conectar Gmail'),
    );
  }
}

// ---------- formulario y controles ----------

$('#form-regla').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const f = ev.target;
  $('#error-regla').textContent = '';
  try {
    await crearRegla({ de: f.de.value, asunto: f.asunto.value, seccion: f.seccion.value,
      subcategoria: f.subcategoria.value, notificar: f.notificar.checked });
    f.reset();
  } catch (e) {
    $('#error-regla').textContent = e.message;
  }
});

$('#refrescar').addEventListener('click', async (ev) => {
  const b = ev.currentTarget;
  b.disabled = true;
  b.textContent = 'Actualizando…';
  try { await api('/api/refrescar', { method: 'POST' }); await cargar(); }
  finally { b.disabled = false; b.textContent = 'Actualizar'; }
});

$('#tema').addEventListener('click', () => {
  const actual = document.documentElement.dataset.theme
    || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const nuevo = actual === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = nuevo;
  try { localStorage.setItem('tema', nuevo); } catch {}
});

// ---------- arranque ----------

async function cargar() {
  try {
    datos = await api('/api/estado');
  } catch {
    $('#estado').textContent = 'El servidor no responde';
    return;
  }
  pintarConfigurar(datos.auth);
  if (datos.auth !== 'autorizado') return;
  if (!reglas.length) reglas = await api('/api/reglas');
  const sel = $('#form-regla').seccion;
  if (!sel.options.length) sel.replaceChildren(...datos.secciones.map((s) => h('option', { value: s }, s)));
  pintarEstado();
  pintar();
}

cargar();
setInterval(cargar, 30_000);
