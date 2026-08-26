# Pruebas automatizadas de FIQT Reviews

La suite tiene tres capas. Ninguna prueba debe apuntar a producción para crear,
moderar o eliminar datos.

## 1. Vitest

Comprueba validaciones de autenticación, rutas de registro/inicio/recuperación,
reglas del formulario, sanciones de planchas y protección del cron.

```powershell
npm run test:unit
```

Durante el desarrollo puede mantenerse en observación:

```powershell
npm run test:unit:watch
```

## 2. Playwright

Los recorridos públicos validan la portada, registro, inicio, recuperación y las
respuestas tempranas de las APIs sin crear cuentas ni enviar correos.

Instala Chromium una sola vez:

```powershell
npx playwright install chromium
```

Después ejecuta:

```powershell
npm run test:e2e
```

Si `E2E_BASE_URL` no existe, Playwright inicia Next.js localmente. Para probar
una sesión estudiantil configura `E2E_STUDENT_EMAIL` y
`E2E_STUDENT_PASSWORD` en `.env.test.local` o en el entorno de la terminal.
Usa siempre una cuenta aislada de pruebas.

## 3. Supabase y pgTAP

Requiere Docker y Supabase CLI. Inicia la base local, aplica las migraciones y
ejecuta las pruebas dentro de transacciones que terminan con `ROLLBACK`:

```powershell
supabase start
npm run test:db
supabase stop
```

Las pruebas SQL protegen RLS, funciones críticas, permisos, índices, triggers,
restricciones, moderación transaccional, matches, chats, entregas y sanciones.
No ejecutes `supabase test db --linked` contra producción.

## Comprobación rápida antes de subir cambios

```powershell
npm run typecheck
npm run test:unit
npm run test:e2e
```

GitHub Actions repite automáticamente las pruebas de aplicación y de base de
datos en entornos aislados.
