import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clasificar, extraerCodigo, extraerImporte } from '../src/clasificar.js';
import reglasEjemplo from '../reglas.ejemplo.json' with { type: 'json' };

const reglas = reglasEjemplo.reglas;

test('extrae código de verificación', () => {
  assert.equal(extraerCodigo('Tu código de verificación', 'Introduce 482913 para continuar'), '482913');
  assert.equal(extraerCodigo('G-583920 is your Google verification code', ''), 'G-583920');
  assert.equal(extraerCodigo('Factura 2026', 'Total del pedido 1234'), null);
});

test('no confunde años con códigos', () => {
  assert.equal(extraerCodigo('Código de acceso', 'Válido en 2026. Tu código: 7731'), '7731');
});

test('extrae importe', () => {
  assert.equal(extraerImporte('Has pagado 12,50 € en MERCADONA'), '12,50 €');
  assert.equal(extraerImporte('Compra de 1.234,00 EUR'), '1.234,00 €');
});

test('código gana a cualquier regla', () => {
  const r = clasificar({ de: 'Moodle <noreply@moodle.ilerna.com>', asunto: 'Tu código de acceso es 123456', texto: '' }, reglas);
  assert.equal(r.seccion, 'Códigos');
  assert.equal(r.codigo, '123456');
  assert.equal(r.notificar, true);
});

test('Moodle va a Académico con el curso del asunto', () => {
  const r = clasificar({ de: 'Moodle Ilerna <noreply@moodle.ilerna.com>', asunto: 'DAW M06: Nueva tarea publicada', texto: '' }, reglas);
  assert.equal(r.seccion, 'Académico');
  assert.equal(r.subcategoria, 'DAW M06');
});

test('Santander va a Banco con importe', () => {
  const r = clasificar({ de: 'Banco Santander <avisos@gruposantander.es>', asunto: 'Compra con tarjeta', texto: 'Compra de 23,40 € en AMAZON' }, reglas);
  assert.equal(r.seccion, 'Banco');
  assert.equal(r.importe, '23,40 €');
});

test('sin regla va a Otros y no notifica', () => {
  const r = clasificar({ de: 'ofertas@tienda.com', asunto: '50% descuento', texto: '' }, reglas);
  assert.equal(r.seccion, 'Otros');
  assert.equal(r.notificar, false);
});
