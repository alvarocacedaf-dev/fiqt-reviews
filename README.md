# FIQT Reviews

MVP de una plataforma estudiantil independiente para orientar experiencias académicas de FIQT. No representa a la UNI ni usa marcas institucionales.

El proyecto incluye datos temporales de profesores ficticios. El catálogo de cursos puede cargarse desde la malla proporcionada, sin notas, periodos, veces ni datos personales.

## Puesta en marcha

1. Crea un proyecto en [Supabase](https://supabase.com) y copia `.env.example` a `.env.local` con sus credenciales.
2. En el SQL Editor de Supabase ejecuta `supabase/migrations/001_initial_schema.sql`.
3. Si ya tenías la base creada y solo quieres actualizar los cursos, ejecuta también `supabase/seed_fiqt_courses.sql`.
4. Instala y ejecuta:

```bash
npm install
npm run dev
```

5. Abre `http://localhost:3000`. Registra una cuenta y, para habilitar el panel, ejecuta en Supabase:

```sql
insert into public.profiles (id, full_name, role, verification_status)
select id, 'Administrador', 'admin', 'verified'
from auth.users
where email = 'TU_CORREO_AQUI'
on conflict (id) do update set role='admin', verification_status='verified';
```

## Arquitectura

- `app/`: rutas App Router, vistas públicas, autenticación, verificación y panel admin.
- `components/`: tarjetas de cursos/docentes, formulario guiado de reseña, estado de verificación.
- `lib/`: clientes Supabase, consultas y datos demo.
- `supabase/migrations/`: esquema PostgreSQL, RLS, Storage privado y seeds iniciales.
- `supabase/seed_fiqt_courses.sql`: catálogo de cursos por ciclo para actualizar una base ya creada.

Las evidencias se guardan en el bucket privado `verification-evidence`; el administrador las abre con enlaces firmados de corta duración. Las reseñas se crean en estado `pending` y el trigger de base de datos exige que el curso esté en `verified_courses`.

## TODO antes de producción

- Añadir gestor de asociaciones profesor–curso, CRUD de ciclos y pantalla de reportes dedicada.
- Mover moderación léxica a un servicio más completo, registro de auditoría y proceso de apelaciones.
- Eliminar automáticamente la evidencia privada tras su revisión y definir política de retención.
- Validar tipo, tamaño y contenido de archivos con una función segura de servidor.
- Añadir rate limiting, CAPTCHA, analítica anónima, pruebas E2E y monitoreo.
- Crear flujo de corrección/retiro de datos para docentes y un canal de contacto real.
- Revisar las políticas con el equipo legal/universitario antes de cargar datos reales.
