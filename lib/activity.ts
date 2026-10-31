export const ACTIVITY_EVENTS = ['page_view', 'download_click', 'zip_click'] as const;
export type ActivityEventName = typeof ACTIVITY_EVENTS[number];
export type ActivityResource = { type: 'course' | 'worksheet' | 'professor'; id: string };
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function activityResource(path: string): ActivityResource | null {
  const url = new URL(path, 'https://activity.invalid');
  const parts = url.pathname.split('/');
  const type = parts[1] === 'cursos' ? 'course' : parts[1] === 'profesores' ? 'professor'
    : parts[1] === 'planchas-administracion' && parts[2] === 'archivo' ? 'worksheet'
    : parts[1] === 'api' && parts[2] === 'admin-worksheets' ? (parts[3] === 'folder-download' ? 'course' : 'worksheet') : null;
  const id = parts[1] === 'api' ? (parts[3] === 'folder-download' ? url.searchParams.get('courseId') : parts[3])
    : parts[1] === 'planchas-administracion' ? parts[3] : parts[2];
  return type && id && UUID_PATTERN.test(id) ? { type, id } : null;
}

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
  resources: { type: string; id: string; name: string; views: number; downloads: number }[];
  daily: { day: string; views: number; visitors: number }[];
  recent: { id: string; name: string; event: string; section: string; created_at: string }[];
};
