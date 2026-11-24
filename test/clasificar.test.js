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

test('no confunde códigos de devolución ni números de enlaces', () => {
  const texto = 'Código de devolución Haz clic aquí para ver el código de devolución ( https://www.amazon.es/spr/returns/prep?contractId=1984022&x=1 )';
  assert.equal(extraerCodigo('Tu devolución de un reloj', texto), null);
  assert.equal(extraerCodigo('Tu pedido', 'Usa el promo code 4455 en tu próxima compra'), null);
});

test('no confunde códigos promocionales', () => {
  assert.equal(extraerCodigo('-50% en Creatina', 'Envío gratis 🚨El código expira en 2 días &zwnj; &#13400484; ref 13400484'), null);
});

test('no confunde IDs de reunión ni "Passcode"', () => {
  assert.equal(extraerCodigo('New Message', 'Meeting ID: 950 8341 2248 Passcode: 3C4MMs'), null);
});

test('sigue detectando códigos reales', () => {
  assert.equal(extraerCodigo('Restablecimiento de contraseña', 'Use este código para restablecer la contraseña. Este es tu código: 231824'), '231824');
  assert.equal(extraerCodigo('Your verification code', 'Your code is 902113. It expires in 10 minutes.'), '902113');
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
