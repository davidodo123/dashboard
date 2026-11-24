// Clasificación de correos: detección de códigos + reglas por remitente/asunto.

export const SECCIONES = ['Códigos', 'Importante', 'Académico', 'Banco', 'Otros'];

// Palabras completas: "Passcode" o "shopping" no cuentan.
const PALABRAS_CODIGO =
  /(?<![\p{L}\p{N}])(c[oó]digo|code|verificaci[oó]n|verification|verify|verifica|one[- ]time|otp|2fa|pin|contrase[nñ]a temporal|security code|inicio de sesi[oó]n|login)(?![\p{L}\p{N}])/giu;

// "Código de devolución", "promo code"… no son códigos de verificación.
const NO_ES_VERIFICACION =
  /^\s*(de\s+)?(devoluci[oó]n|seguimiento|pedido|postal|promocional|descuento|regalo|cup[oó]n|env[ií]o|cliente|referencia|reserva|tracking|discount|promo)/i;
const ANTES_NO_VERIFICACION = /(promo|discount|tracking|gift|postal|zip)\s*$/i;

const CODIGO = /\b([A-Z]{1,3}-)?(\d{4,8})\b/g;

function sinTildes(t) {
  return (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function contiene(texto, aguja) {
  return sinTildes(texto).includes(sinTildes(aguja));
}

/** Busca un código de verificación cerca de una palabra clave. Devuelve el código o null. */
// Ofertas: un "código" junto a un descuento es promocional.
const PUBLICIDAD = /descuento|discount|cup[oó]n|coupon|rebaja|oferta|\d\s?%|% ?off|env[ií]o gratis|free shipping/i;

// Sin enlaces ni entidades HTML: sus números no son códigos.
const sinEnlaces = (t) => (t || '')
  .replace(/\(?\s*https?:\/\/[^\s)]+\)?/gi, ' ')
  .replace(/&#?\w+;/g, ' ');

function candidatos(v) {
  return [...v.matchAll(CODIGO)]
    .filter((x) => {
      // Descarta trozos de grupos de números ("950 8341 2248", teléfonos, IDs de reunión).
      const antes = v.slice(Math.max(0, x.index - 2), x.index);
      const despues = v.slice(x.index + x[0].length, x.index + x[0].length + 2);
      return !/\d[\s.-]?$/.test(antes) && !/^[\s.-]?\d/.test(despues);
    })
    .map((x) => (x[1] || '') + x[2])
    .filter((c) => !/^(19|20)\d{2}$/.test(c)); // descarta años
}

export function extraerCodigo(asunto, texto) {
  const todo = `${sinEnlaces(asunto)}\n${sinEnlaces(texto)}`;
  for (const m of todo.matchAll(PALABRAS_CODIGO)) {
    const fin = m.index + m[0].length;
    if (NO_ES_VERIFICACION.test(todo.slice(fin, fin + 30))) continue;
    if (ANTES_NO_VERIFICACION.test(todo.slice(Math.max(0, m.index - 12), m.index))) continue;
    if (PUBLICIDAD.test(todo.slice(Math.max(0, m.index - 120), fin + 120))) continue;
    // Ventana alrededor de la palabra clave.
    const c = candidatos(todo.slice(Math.max(0, m.index - 150), fin + 300));
    if (c.length) return c[0];
  }
  return null;
}

/** Extrae un importe en euros (tickets del banco). */
export function extraerImporte(texto) {
  const m = /(-?\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})|-?\d+(?:[.,]\d{2}))\s?(€|eur\b|euros)/i.exec(texto || '');
  return m ? `${m[1]} €` : null;
}

function coincide(regla, correo) {
  const condiciones = [];
  if (regla.de) condiciones.push(contiene(correo.de, regla.de));
  if (regla.asunto) condiciones.push(contiene(correo.asunto, regla.asunto));
  return condiciones.length > 0 && condiciones.every(Boolean);
}

function subcategoria(regla, correo) {
  if (regla.subcategoriaRegex) {
    try {
      const m = new RegExp(regla.subcategoriaRegex, 'i').exec(correo.asunto || '');
      if (m) return (m[1] || m[0]).trim();
    } catch {
      /* regex inválida: se ignora */
    }
  }
  return regla.subcategoria || null;
}

/**
 * Clasifica un correo.
 * correo: { id, de, asunto, texto, fecha }
 * reglas: [{ de?, asunto?, seccion, subcategoria?, subcategoriaRegex?, notificar? }]
 * Devuelve { seccion, subcategoria, codigo, importe, notificar, regla }
 */
export function clasificar(correo, reglas = []) {
  const regla = reglas.find((r) => coincide(r, correo)) || null;

  // 1. Códigos de verificación, vengan de quien vengan (salvo regla que lo desactive).
  if (!regla || regla.detectarCodigos !== false) {
    const codigo = extraerCodigo(correo.asunto, correo.texto);
    if (codigo) {
      return { seccion: 'Códigos', subcategoria: null, codigo, importe: null, notificar: true, regla: regla ? reglas.indexOf(regla) : null };
    }
  }

  // 2. Primera regla que coincide.
  if (regla) {
    const seccion = SECCIONES.includes(regla.seccion) ? regla.seccion : 'Otros';
    return {
      seccion,
      subcategoria: subcategoria(regla, correo),
      codigo: null,
      importe: seccion === 'Banco' ? extraerImporte(`${correo.asunto}\n${correo.texto}`) : null,
      notificar: regla.notificar ?? seccion === 'Importante',
      regla: reglas.indexOf(regla),
    };
  }

  // 3. Sin regla: a Otros.
  return { seccion: 'Otros', subcategoria: null, codigo: null, importe: null, notificar: false, regla: null };
}
