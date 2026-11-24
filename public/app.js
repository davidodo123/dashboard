// Dashboard de correo (cliente). Todo el texto de los correos se pinta con textContent.

const $ = (s) => document.querySelector(s);
let datos = { correos: [], secciones: [] };
let reglas = [];
let cursoActivo = 'Todos';

function h(tag, props = {}, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of hijos.flat()) if (c != null) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}

const remitente = (de) => (/^"?([^"<]+?)"?\s*</.exec(de || '')?.[1] || de || '').trim();
const direccion = (de) => (/<([^>]+)>/.exec(de || '')?.[1] || de || '').trim();

function hora(ms) {
  const d = new Date(ms);
  const hoy = new Date();
  const mismoDia = d.toDateString() === hoy.toDateString();
  return mismoDia
    ? d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function haceCuanto(ms) {
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return 'ahora';
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

// ---------- pintar ----------

function itemCorreo(c, { extra, accion } = {}) {
  return h('li', {},
    h('span', { class: 'de', title: c.de }, remitente(c.de)),
    extra || h('span', { class: 'hora' }, hora(c.fecha)),
    h('span', { class: 'asunto', title: c.asunto }, c.asunto),
    c.resumen ? h('span', { class: 'resumen-correo' }, c.resumen) : null,
    accion || null,
  );
}

function lista(el, items, vacio) {
  el.replaceChildren(...(items.length ? items : [h('li', { class: 'vacio' }, vacio)]));
}

function pintarCodigos(codigos) {
  const el = $('#codigos');
  if (!codigos.length) return el.replaceChildren(h('p', { class: 'vacio' }, 'Ningún código en los últimos días.'));
  el.replaceChildren(...codigos.slice(0, 8).map((c) => {
    const viejo = Date.now() - c.fecha > 30 * 60 * 1000;
    const boton = h('button', { class: 'boton mini', type: 'button', onclick: async () => {
      await navigator.clipboard.writeText(c.codigo);
      boton.textContent = 'Copiado';
      setTimeout(() => (boton.textContent = 'Copiar'), 1500);
    } }, 'Copiar');
    return h('div', { class: `codigo${viejo ? ' viejo' : ''}` },
      h('div', { class: 'fila' }, h('span', { class: 'valor' }, c.codigo), boton),
      h('div', { class: 'fila' }, h('span', { class: 'de' }, remitente(c.de)), h('span', { class: 'meta' }, haceCuanto(c.fecha))),
    );
  }));
}

function pintarAcademico(academicos) {
  const cursos = ['Todos', ...new Set(academicos.map((c) => c.subcategoria || 'Sin curso'))];
  if (!cursos.includes(cursoActivo)) cursoActivo = 'Todos';
  $('#cursos').replaceChildren(...cursos.map((curso) =>
    h('button', { class: 'chip', role: 'tab', type: 'button', 'aria-selected': String(curso === cursoActivo),
      onclick: () => { cursoActivo = curso; pintar(); } }, curso)));
  const filtrados = cursoActivo === 'Todos' ? academicos : academicos.filter((c) => (c.subcategoria || 'Sin curso') === cursoActivo);
  lista($('#academico'), filtrados.slice(0, 30).map((c) => itemCorreo(c)), 'Nada académico.');
}

function pintarBanco(banco) {
  const total = banco.reduce((s, c) => {
    const n = Number((c.importe || '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.'));
    return s + (Number.isFinite(n) ? n : 0);
  }, 0);
  $('#total-banco').textContent = banco.some((c) => c.importe)
    ? `${total.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € en ${banco.length} avisos`
    : '';
  lista($('#banco'), banco.slice(0, 30).map((c) =>
    itemCorreo(c, { extra: h('span', { class: 'importe' }, c.importe || hora(c.fecha)) })), 'Sin tickets del banco.');
}

function pintarOtros(otros) {
  $('#n-otros').textContent = otros.length;
  lista($('#otros'), otros.slice(0, 60).map((c) =>
    itemCorreo(c, { accion: h('button', { class: 'boton mini', type: 'button', style: 'grid-column:1/-1;justify-self:start;margin-top:4px',
      onclick: () => prepararRegla(direccion(c.de)) }, 'Clasificar') })), 'Vacío.');
}

function pintarResumen(por) {
  const cifras = [
    ['Códigos', por['Códigos'].length],
    ['Importantes', por['Importante'].length],
    ['Académicos', por['Académico'].length],
    ['Banco', por['Banco'].length],
    ['Otros', por['Otros'].length],
  ];
  $('#resumen').replaceChildren(...cifras.map(([t, n]) => h('div', { class: 'cifra' }, h('b', {}, n), h('span', {}, t))));
}

function pintarReglas() {
  lista($('#reglas'), reglas.map((r, i) => h('li', {},
    h('span', {},
      r.de ? h('code', {}, r.de) : null, r.de && r.asunto ? ' + ' : '', r.asunto ? h('code', {}, `asunto: ${r.asunto}`) : null,
      ' → ', h('b', {}, r.seccion), r.subcategoria ? ` · ${r.subcategoria}` : '', r.notificar ? ' · avisa' : ''),
    h('button', { class: 'boton mini', type: 'button', 'aria-label': `Quitar regla ${r.de || r.asunto}`, onclick: async () => {
      reglas = await api(`/api/reglas/${i}`, { method: 'DELETE' });
      await cargar();
    } }, 'Quitar'),
  )), 'Sin reglas.');
}

function pintar() {
  const por = Object.fromEntries(datos.secciones.map((s) => [s, []]));
  for (const c of datos.correos) (por[c.seccion] || por['Otros']).push(c);
  pintarResumen(por);
  pintarCodigos(por['Códigos']);
  lista($('#importante'), por['Importante'].slice(0, 30).map((c) => itemCorreo(c)), 'Nada importante.');
  pintarAcademico(por['Académico']);
  pintarBanco(por['Banco']);
  pintarOtros(por['Otros']);
  pintarReglas();
}

function pintarEstado() {
  const e = $('#estado');
  e.classList.toggle('mal', Boolean(datos.ultimoError));
  e.title = datos.ultimoError || '';
  e.textContent = datos.ultimoError
    ? `Error: ${datos.ultimoError}`
    : datos.ultimaLectura ? `Actualizado ${haceCuanto(datos.ultimaLectura)}` : 'Leyendo…';
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
        h('li', {}, 'En «Credenciales» crea un ', h('b', {}, 'ID de cliente OAuth'), ' de tipo ', h('b', {}, 'Aplicación de escritorio'), '.'),
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

// ---------- formulario ----------

function prepararRegla(de) {
  const f = $('#form-regla');
  f.de.value = de;
  f.seccion.value = 'Importante';
  f.scrollIntoView({ behavior: 'smooth', block: 'center' });
  f.seccion.focus();
}

$('#form-regla').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const f = ev.target;
  $('#error-regla').textContent = '';
  try {
    reglas = await api('/api/reglas', { method: 'POST', body: JSON.stringify({
      de: f.de.value, asunto: f.asunto.value, seccion: f.seccion.value,
      subcategoria: f.subcategoria.value, notificar: f.notificar.checked,
    }) });
    f.reset();
    await cargar();
  } catch (e) {
    $('#error-regla').textContent = e.message;
  }
});

$('#refrescar').addEventListener('click', async (ev) => {
  ev.target.disabled = true;
  try { await api('/api/refrescar', { method: 'POST' }); await cargar(); } finally { ev.target.disabled = false; }
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
