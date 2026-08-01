# Cloudflare R2 para planchas administrativas

Esta integración mueve únicamente los archivos de **Planchas de la administración** a R2.
Supabase continúa guardando los cursos, títulos, tamaños, usuarios y permisos.

## 1. Crear el bucket privado

1. En Cloudflare abre **R2 Object Storage**.
2. Crea un bucket llamado `fiqt-admin-worksheets`.
3. No habilites acceso público.

## 2. Crear credenciales limitadas

1. En R2 abre **Manage R2 API Tokens**.
2. Crea un token con permiso **Object Read & Write**.
3. Limítalo únicamente al bucket `fiqt-admin-worksheets`.
4. Guarda el **Access Key ID**, **Secret Access Key** y el **Account ID**.

## 3. Configurar CORS

En el bucket abre **Settings > CORS Policy > Add CORS policy** y pega:

```json
[
  {
    "AllowedOrigins": [
      "https://fiqt-reviews.vercel.app",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```

Si se usa otro dominio de producción, debe agregarse exactamente como otro valor de
`AllowedOrigins`, sin una barra `/` al final.

## 4. Variables privadas

Agrega estas variables en `.env.local` para desarrollo y en Vercel para Production y Preview:

```dotenv
R2_ACCOUNT_ID=tu_account_id
R2_ACCESS_KEY_ID=tu_access_key_id
R2_SECRET_ACCESS_KEY=tu_secret_access_key
R2_BUCKET_NAME=fiqt-admin-worksheets
```

Ninguna variable de R2 debe comenzar con `NEXT_PUBLIC_`.

## 5. Migración de Supabase

Ejecuta el contenido de `supabase/migrations/024_admin_worksheets_r2.sql` en SQL Editor.

## 6. Desplegar y probar

Después de guardar las variables, vuelve a desplegar en Vercel. Sube un archivo pequeño,
ábrelo mediante el botón **Abrir** y elimínalo. El objeto debe aparecer y desaparecer en R2,
mientras que el bucket `admin-worksheets` de Supabase debe permanecer vacío.
