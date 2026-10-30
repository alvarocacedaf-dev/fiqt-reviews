export const ACTIVITY_EVENTS = ['page_view', 'download_click', 'zip_click'] as const;
export type ActivityEventName = typeof ACTIVITY_EVENTS[number];
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// No query strings, fragments, chat IDs or arbitrary user text are collected.
export function activitySection(path: string): string | null {
  const pathname = path.split(/[?#]/, 1)[0];
  if (pathname === '/') return 'Inicio';
  const labels: Record<string, string> = {
    ciclos: 'Ciclos', cursos: 'Cursos y materiales', profesores: 'Profesores y reseñas',
    'planchas-administracion': 'Planchas de la administración', planchas: 'Comunidad de planchas',
    verificacion: 'Verificación', 'cursos-verificados': 'Cursos verificados',
    'mis-matches': 'Matches y chats', 'armar-horario': 'Armar horario', horario: 'Mi horario',
    login: 'Inicio de sesión', registro: 'Registro', 'recuperar-contrasena': 'Recuperar contraseña',
  };
  const key = pathname.split('/')[1];
  return Object.hasOwn(labels, key) ? labels[key] : null;
}

export type ActivitySnapshot = {
  generated_at: string;
  totals: { views: number; visitors: number; accounts: number; downloads: number };
  online: { key: string; name: string; registered: boolean; section: string; active: boolean; last_seen: string }[];
  popular: { section: string; views: number; visitors: number }[];
  daily: { day: string; views: number; visitors: number }[];
  recent: { id: string; name: string; event: string; section: string; created_at: string }[];
};
