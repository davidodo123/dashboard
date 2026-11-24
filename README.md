# Dashboard de correo

App local que lee tu Gmail (solo lectura), separa los correos por remitente y te avisa en pantalla de lo importante.

- **Códigos**: códigos de verificación detectados en cualquier correo, con botón de copiar.
- **Importante**: los remitentes que marques.
- **Académico**: Moodle e Ilerna, filtrables por curso.
- **Banco**: tickets de Santander con el importe y el total.
- **Amazon**: aparte, separado en Devolución / Envío / Pedido / Publicidad, con las devoluciones primero.
- **Otros**: spam y sin clasificar. «Clasificar» manda el remitente a su sección.

Los correos, el token de Google y tus reglas se guardan solo en `data/`, que no se sube a git.

## Puesta en marcha

1. `npm install`
2. Credenciales de Google:
   1. En [console.cloud.google.com](https://console.cloud.google.com) crea un proyecto y activa la **Gmail API**.
   2. En **Pantalla de consentimiento OAuth** elige *Externo*, déjala en *Prueba* y añade tu Gmail como usuario de prueba.
   3. En **Credenciales**, crea un **ID de cliente OAuth** de tipo **Aplicación de escritorio**.
   4. Descarga el JSON y guárdalo como `credentials.json` en esta carpeta.
3. `npm start` y abre http://127.0.0.1:4321, luego pulsa **Conectar Gmail**.
4. Arranque con Windows: `npm run inicio:instalar` (para quitarlo: `npm run inicio:quitar`).

## Reglas

Se editan desde el dashboard (sección Remitentes) o en `data/reglas.json`. La primera que coincide gana; las nuevas van arriba.

```json
{ "de": "moodle", "seccion": "Académico", "subcategoriaRegex": "^\[?([^\]:\-–]+)" }
{ "de": "santander", "seccion": "Banco" }
{ "de": "jefe@empresa.com", "seccion": "Importante", "notificar": true }
```

- `de` y `asunto`: texto que debe contener el remitente o el asunto (sin distinguir mayúsculas ni tildes).
- `subcategoriaRegex`: saca el curso del asunto (primer grupo).
- `subcategorias`: lista de `{ "nombre", "palabras" }`; gana la primera cuyas palabras salen en el asunto (así se separan las devoluciones de Amazon).
- `notificar`: notificación en pantalla. Los códigos y la sección Importante avisan siempre.

## Variables opcionales

| Variable | Por defecto |
|---|---|
| `PUERTO` | `4321` |
| `INTERVALO_SEGUNDOS` | `60` |

## Tests

`npm test`
