# PWA de FIQT Reviews

FIQT Reviews está configurada como una Progressive Web App con alcance completo (`/`), inicio en la portada y modo `standalone`. Al iniciarse desde el ícono del dispositivo, iOS y Android pueden mostrarla sin la interfaz habitual del navegador.

## Instalación en iPhone o iPad

1. Abrir la dirección de producción en **Safari**.
2. Pulsar **Compartir**.
3. Elegir **Agregar a inicio**.
4. Confirmar el nombre `FIQT Reviews` y pulsar **Agregar**.
5. Abrirla desde el nuevo ícono, no desde la pestaña que quedó abierta en Safari.

Apple decide algunos detalles de la barra de estado según la versión de iOS. El modo independiente solo se activa cuando la aplicación se abre desde el ícono instalado.

## Instalación en Android

1. Abrir la dirección de producción en Chrome.
2. Abrir el menú del navegador.
3. Elegir **Instalar aplicación** o **Agregar a pantalla principal**.
4. Abrir FIQT Reviews desde su ícono.

## Caché y seguridad

El service worker almacena únicamente el manifest, los íconos y archivos compilados estáticos de Next.js. No intercepta ni guarda:

- páginas o navegaciones;
- solicitudes `/api`;
- sesiones y autenticación;
- consultas de Supabase;
- reseñas, verificaciones ni información privada.

Por esta razón, esta primera versión es instalable pero no promete funcionamiento completo sin conexión.

## Íconos

Los archivos de `public/icons/` son íconos temporales con la marca FIQT Reviews. Pueden reemplazarse manteniendo exactamente los mismos nombres, formatos y dimensiones:

- `icon-192.png`: 192 × 192;
- `icon-512.png`: 512 × 512;
- `icon-512-maskable.png`: 512 × 512 y contenido dentro de la zona segura;
- `apple-touch-icon.png`: 180 × 180.

## Comprobación en producción

1. Desplegar en Vercel mediante HTTPS.
2. Abrir `/manifest.webmanifest` y comprobar que responde correctamente.
3. Abrir `/icons/icon-192.png` y `/icons/icon-512.png`.
4. En Chrome de escritorio, revisar **DevTools → Application → Manifest** y **Service Workers**.
5. Si se cambia el service worker, incrementar `CACHE_NAME` en `public/sw.js` para retirar la caché anterior.
