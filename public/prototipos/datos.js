// Datos reales del Centro en vivo convertidos en un árbol navegable: apartado → elemento → detalle.
// Lo comparten los tres prototipos de navegación.

export const CAT_COLOR = {
  Programar: 'var(--a-programar)', Navegar: 'var(--a-navegar)', Juegos: 'var(--a-juegos)',
  Multimedia: 'var(--a-multimedia)', Otros: 'var(--a-otros)',
};
const CAT_PROC = [
  ['Programar', /^(code|cursor|claude|node|git|powershell|pwsh|windowsterminal|openconsole|conhost|cmd|docker|wsl|obsidian|postman)/i],
  ['Navegar', /^(chrome|msedge|opera|firefox|brave)/i],
  ['Juegos', /^(steam|epic|battle|riot|league|valorant|nvidia)/i],
  ['Multimedia', /^(spotify|vlc|stremio|discord|whatsapp|obs|capcut)/i],
];
export const catDeProceso = (p) => (CAT_PROC.find(([, re]) => re.test(p)) || ['Otros'])[0];

export function duracion(s) {
  s = Math.round(s || 0);
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
}
export const mb = (n) => (n >= 1024 ? `${(n / 1024).toFixed(1).replace('.', ',')} GB` : `${Math.round(n)} MB`);
export function velocidad(b) {
  if (b < 1024) return `${Math.round(b)} B/s`;
  if (b < 1024 ** 2) return `${Math.round(b / 1024)} KB/s`;
  return `${(b / 1024 ** 2).toFixed(1).replace('.', ',')} MB/s`;
}
export function hace(ms) {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}
const remitente = (de) => (/^"?([^"<]+?)"?\s*</.exec(de || '')?.[1] || de || '').trim();

async function api(r) {
  const x = await fetch(r);
  if (!x.ok) throw new Error(`${r}: ${x.status}`);
  return x.json();
}

/** Nodo: { id, nombre, sub, valor, etiqueta, color, hijos, campos: [[k, v]], texto } */
export async function cargarArbol() {
  const [c, correo] = await Promise.all([api('/api/centro'), api('/api/estado').catch(() => ({ correos: [] }))]);
  const s = c.sistema;
  const act = c.actividad;

  const ahora = {
    id: 'ahora', nombre: 'Ahora', sub: act.ahora ? act.ahora.app : 'Sin actividad', icono: 'ahora',
    hijos: [
      act.ahora && { id: 'ahora-app', nombre: act.ahora.app, sub: act.ahora.categoria, color: CAT_COLOR[act.ahora.categoria],
        etiqueta: duracion((Date.now() - act.ahora.desde) / 1000), valor: 1,
        campos: [['Categoría', act.ahora.categoria], ['Proyecto', act.ahora.proyecto || '—'], ['Delante desde', duracion((Date.now() - act.ahora.desde) / 1000)]] },
      { id: 'ahora-cpu', nombre: 'CPU', vivo: 'cpu', etiqueta: `${Math.round(s.ahora.cpu ?? 0)} %`, valor: s.ahora.cpu || 1, sub: `${s.equipo.nucleos} núcleos`,
        campos: [['Procesador', s.equipo.cpu], ['Núcleos', s.equipo.nucleos]] },
      { id: 'ahora-ram', nombre: 'Memoria', vivo: 'ram', etiqueta: `${Math.round(s.ahora.ram ?? 0)} %`, valor: s.ahora.ram || 1, sub: `${s.ahora.ramUsadaGB} de ${s.ahora.ramTotalGB} GB`,
        campos: [['En uso', `${s.ahora.ramUsadaGB} GB`], ['Total', `${s.ahora.ramTotalGB} GB`]] },
      { id: 'ahora-red', nombre: 'Red', vivo: 'bajada', etiqueta: velocidad(s.ahora.bajada), valor: 1, sub: `subida ${velocidad(s.ahora.subida)}`,
        campos: [['Bajada', velocidad(s.ahora.bajada)], ['Subida', velocidad(s.ahora.subida)]] },
    ].filter(Boolean),
  };

  const apps = {
    id: 'apps', nombre: 'Apps de hoy', sub: `${duracion(act.totalS)} activo`, icono: 'apps', etiqueta: duracion(act.totalS),
    hijos: act.apps.map((a) => ({
      id: `app-${a.nombre}`, nombre: a.nombre, sub: a.categoria, color: CAT_COLOR[a.categoria], valor: a.s, etiqueta: duracion(a.s),
      campos: [['Tiempo hoy', duracion(a.s)], ['Categoría', a.categoria], ['Proceso', a.proceso], ['Parte del día', `${Math.round((100 * a.s) / (act.totalS || 1))} %`]],
    })),
    categorias: act.categorias,
  };

  const porNombre = new Map();
  for (const p of [...s.memoria, ...s.procesos]) porNombre.set(p.proceso, p);
  const procesos = {
    id: 'procesos', nombre: 'Procesos', sub: `${porNombre.size} con más consumo`, icono: 'procesos',
    hijos: [...porNombre.values()].sort((a, b) => b.ramMB - a.ramMB).map((p) => {
      const cat = catDeProceso(p.proceso);
      return { id: `proc-${p.proceso}`, nombre: p.proceso, sub: `${p.n} proceso${p.n === 1 ? '' : 's'} · ${p.cpu.toLocaleString('es-ES')} % CPU`, color: CAT_COLOR[cat],
        valor: p.ramMB, etiqueta: mb(p.ramMB),
        campos: [['Memoria', mb(p.ramMB)], ['CPU ahora', `${p.cpu.toLocaleString('es-ES')} %`], ['Instancias', p.n], ['Categoría', cat]] };
    }),
  };

  const tok = (p) => c.proyectos.tokensHoy.filter((t) => [p.nombre, p.carpeta].map((x) => x.toLowerCase()).includes(t.proyecto.toLowerCase())).reduce((a, t) => a + t.tokens, 0);
  const proyectos = {
    id: 'proyectos', nombre: 'Proyectos', sub: `${c.proyectos.proyectos.length} en tu PC`, icono: 'proyectos',
    hijos: c.proyectos.proyectos.map((p) => ({
      id: `proy-${p.nombre}`, nombre: p.nombre, sub: p.fase || 'Sin pendientes', valor: Math.max(p.horas, 0.3), etiqueta: `${p.progreso ?? 0} %`,
      progreso: p.progreso, color: 'var(--acento)',
      texto: p.siguiente ? `Siguiente: ${p.siguiente}` : null,
      campos: [['Progreso', `${p.progreso ?? 0} % · ${String(p.tareas.hechas).replace('.', ',')} de ${p.tareas.total} tareas`], ['Horas', `${p.horas.toLocaleString('es-ES')} h · ${p.commits} commits`],
        ['Hoy', [p.commitsHoy ? `${p.commitsHoy} commits` : null, tok(p) ? `${(tok(p) / 1e6).toFixed(1).replace('.', ',')} M tokens` : null].filter(Boolean).join(' · ') || 'sin actividad'],
        ['Último commit', p.ultimoCommit ? `${hace(Date.parse(p.ultimoCommit.fecha))} · ${p.ultimoCommit.mensaje}` : '—'],
        ['Sin subir', p.cambios || p.sinSubir ? `${p.cambios} cambios · ${p.sinSubir ?? '—'} commits` : 'todo subido']],
      hijos: p.fases.map((f) => ({ id: `fase-${p.nombre}-${f.fase}`, nombre: f.fase, valor: f.total, etiqueta: `${Math.round((100 * f.hechas) / f.total)} %`,
        progreso: Math.round((100 * f.hechas) / f.total), sub: `${String(f.hechas).replace('.', ',')} de ${f.total} tareas`, color: 'var(--acento)',
        campos: [['Tareas', `${String(f.hechas).replace('.', ',')} de ${f.total}`]] })),
    })),
  };

  const secciones = ['Códigos', 'Importante', 'Académico', 'Banco', 'Amazon', 'Otros'];
  const correoNodo = {
    id: 'correo', nombre: 'Correo', sub: `${correo.correos.length} en 3 días`, icono: 'correo',
    hijos: secciones.map((sec) => {
      const lista = correo.correos.filter((m) => m.seccion === sec);
      return { id: `sec-${sec}`, nombre: sec, sub: `${lista.length} correo${lista.length === 1 ? '' : 's'}`, valor: Math.max(lista.length, 0.5), etiqueta: String(lista.length),
        hijos: lista.slice(0, 40).map((m) => ({ id: `m-${m.id}`, nombre: m.asunto, sub: remitente(m.de), valor: 1, etiqueta: hace(m.fecha),
          texto: m.codigo ? `Código ${m.codigo}` : m.resumen, campos: [['De', remitente(m.de)], ['Llegó', hace(m.fecha)], ['Tipo', m.subcategoria || sec]] })) };
    }),
  };

  const sistema = {
    id: 'sistema', nombre: 'Sistema', sub: s.equipo.nombre, icono: 'sistema',
    hijos: [
      ...s.discos.map((d) => ({ id: `disco-${d.unidad}`, nombre: `Disco ${d.unidad}`, sub: `${d.libreGB} GB libres`, valor: d.totalGB, etiqueta: `${Math.round((100 * (d.totalGB - d.libreGB)) / d.totalGB)} %`,
        progreso: Math.round((100 * (d.totalGB - d.libreGB)) / d.totalGB), campos: [['Libre', `${d.libreGB} GB`], ['Total', `${d.totalGB} GB`]] })),
      { id: 'equipo', nombre: s.equipo.nombre, sub: s.equipo.cpu, valor: 1, etiqueta: hace(s.ahora.encendidoDesde).replace('hace', 'encendido hace'),
        campos: [['Procesador', s.equipo.cpu], ['Núcleos', s.equipo.nucleos], ['Memoria', `${s.ahora.ramTotalGB} GB`], ['Encendido', hace(s.ahora.encendidoDesde)]] },
    ],
  };

  const notas = c.buzon.proyectos.flatMap((b) => [
    ...b.errores.map((e) => ({ tipo: 'Error', proyecto: b.id, ...e })),
    ...b.ideas.map((i) => ({ tipo: 'Idea', proyecto: b.id, ...i })),
  ]);
  const buzon = {
    id: 'buzon', nombre: 'Buzón', sub: `${notas.length} pendiente${notas.length === 1 ? '' : 's'}`, icono: 'buzon',
    hijos: notas.map((n, i) => ({ id: `nota-${i}`, nombre: n.titulo || n.texto.slice(0, 60), sub: `${n.tipo} · ${n.proyecto}`, valor: 1, etiqueta: n.fecha || '',
      texto: n.texto, campos: [['Proyecto', n.proyecto], ['Tipo', n.tipo], ['Apuntada', n.fecha || '—']] })),
  };

  return { id: 'pc', nombre: 'Mi PC', hijos: [ahora, apps, procesos, proyectos, correoNodo, sistema, buzon], crudo: c };
}

/** Llama a fn con /api/vivo cada 2 s (CPU, RAM, red, historia, app delante). */
export function vivo(fn) {
  const tic = async () => { try { fn(await api('/api/vivo')); } catch { /* reintenta */ } };
  tic();
  return setInterval(tic, 2000);
}

/** Iconos geométricos simples (dibujados con trazos, no son imágenes). */
export const ICONOS = {
  ahora: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  apps: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  procesos: '<path d="M4 17l4-6 4 3 4-8 4 5"/>',
  proyectos: '<path d="M4 7h6l2 2h8v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/>',
  correo: '<rect x="3.5" y="6" width="17" height="12" rx="1.5"/><path d="M4 7l8 6 8-6"/>',
  sistema: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M9 20h6M12 16v4"/>',
  buzon: '<path d="M5 5h14v10H9l-4 4z"/>',
};
export const icono = (n, cls = 'ico') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS[n] || ''}</svg>`;
