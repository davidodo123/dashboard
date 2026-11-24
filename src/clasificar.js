// Clasificación de correos: detección de códigos + reglas por remitente/asunto.

export const SECCIONES = ['Códigos', 'Importante', 'Académico', 'Banco', 'Otros'];

const PALABRAS_CODIGO =
  /(c[oó]digo|code|verificaci[oó]n|verification|verify|verifica|one[- ]time|otp|2fa|pin|contrase[nñ]a temporal|security code|inicio de sesi[oó]n|login)/i;

const CODIGO = /\b([A-Z]{1,3}-)?(\d{4,8})\b/g;

function sinTildes(t) {
  return (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function contiene(texto, aguja) {
  return sinTildes(texto).includes(sinTildes(aguja));
}

/** Busca un código de verificación cerca de una palabra clave. Devuelve el código o null. */
export function extraerCodigo(asunto, texto) {
  const todo = `${asunto || ''}\n${texto || ''}`;
  const m = PALABRAS_CODIGO.exec(todo);
  if (!m) return null;
  // Ventana alrededor de la palabra clave; si no hay nada ahí, el asunto entero.
  const ini = Math.max(0, m.index - 150);
  const ventanas = [todo.slice(ini, m.index + 300), asunto || ''];
  for (const v of ventanas) {
    const candidatos = [...v.matchAll(CODIGO)]
      .map((x) => (x[1] || '') + x[2])
      .filter((c) => !/^(19|20)\d{2}$/.test(c)); // descarta años
    if (candidatos.length) return candidatos[0];
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
