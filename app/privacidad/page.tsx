import { ActivityPreference } from '@/components/ActivityPreference';
export default function PrivacyPage() {
  return <article className="panel mx-auto max-w-3xl space-y-4 text-slate-700">
    <h1 className="text-3xl font-black text-ink">Privacidad y estadísticas de actividad</h1>
    <p>FIQT registra las secciones visitadas, clics de descarga y señales de actividad para entender qué funciones se utilizan. Si tienes una sesión iniciada, estas señales se asocian a tu cuenta; sin sesión, se utiliza un identificador aleatorio de navegador.</p>
    <p>El detalle de actividad y los nombres de usuarios conectados solo están disponibles para el propietario de FIQT. Los administradores colaboradores no tienen acceso a este panel.</p>
    <p>No registramos contraseñas, contenido de formularios, conversaciones, documentos de verificación ni parámetros de las direcciones como parte de estas estadísticas. No realizamos grabaciones de pantalla.</p>
    <p>Las señales de presencia se conservan hasta 2 días y el historial de eventos hasta 30 días, con limpieza automática al recibir actividad. La cookie de estadísticas dura 30 días. Los datos se procesan en los servicios de la aplicación, Vercel y Supabase.</p>
    <p>Puedes desactivar las estadísticas opcionales de navegación en este navegador. Las reseñas, verificaciones y aportes que envías siguen generando un registro operativo de envío, necesario para administrar el servicio; el panel conserva ese evento durante el mismo periodo de 30 días.</p>
    <ActivityPreference />
  </article>;
}
