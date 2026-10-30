'use client';
import { useEffect, useState } from 'react';
import type { ActivitySnapshot } from '@/lib/activity';
const eventNames: Record<string,string> = { page_view: 'Visitó una sección', download_click: 'Pulsó descargar', zip_click: 'Solicitó un ZIP', review_submitted: 'Envió una reseña', verification_submitted: 'Envió una verificación', contribution_submitted: 'Envió un Yape' };
const time = (value: string) => new Intl.DateTimeFormat('es-PE', { timeZone:'America/Lima',hour:'2-digit',minute:'2-digit',second:'2-digit' }).format(new Date(value));
export function OwnerActivityDashboard() {
  const [days,setDays] = useState(7);
  const [minutes,setMinutes] = useState(30);
  const [data,setData] = useState<ActivitySnapshot | null>(null);
  const [error,setError] = useState('');
  const [refresh,setRefresh] = useState(0);
  useEffect(() => {
    let disposed = false;
    let busy = false;
    const abort = new AbortController();
    setData(null);
    async function load() {
      if (busy || document.visibilityState === 'hidden') return;
      busy = true;
      try {
        const response = await fetch('/api/admin/activity?days=' + days + '&minutes=' + minutes, { cache:'no-store',signal:abort.signal });
        if (!response.ok) throw new Error(response.status === 403 ? 'Solo el propietario puede consultar este panel.' : 'No se pudo actualizar. Los datos pueden estar desactualizados.');
        const result = await response.json();
        if (!disposed) { setData(result); setError(''); }
      } catch (e) { if (!disposed) setError(e instanceof Error ? e.message : 'No se pudo actualizar.'); }
      finally { busy = false; }
    }
    void load();
    const timer = setInterval(() => void load(),30000);
    const visible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange',visible);
    return () => { disposed=true; abort.abort(); clearInterval(timer); document.removeEventListener('visibilitychange',visible); };
  },[days,minutes,refresh]);
  const active = data?.online.filter(user => user.active).length ?? 0;
  return <div className="space-y-5 text-ink">
    <header className="panel">
      <p className="text-xs font-black uppercase tracking-widest text-royal">Solo propietario</p>
      <h1 className="mt-2 text-3xl font-black">Estadísticas y actividad</h1>
      <p className="mt-2 text-sm text-slate-600">Actualización cada 30 segundos mientras este panel está visible. Horas de Lima.</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="text-sm font-bold">Historial <select aria-label="Periodo del historial" value={days} onChange={e => setDays(Number(e.target.value))} className="ml-2 rounded-lg border p-2"><option value={1}>Últimas 24 horas</option><option value={7}>Últimos 7 días</option><option value={30}>Últimos 30 días</option></select></label>
        <button className="btn-primary text-sm" onClick={() => setRefresh(v => v+1)}>Actualizar ahora</button>
        {data && <span className="text-xs text-slate-500">Última actualización: {time(data.generated_at)}</span>}
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 font-semibold text-red-800">{error}</p>}
      {!data && !error && <p role="status" className="mt-4">Consultando actividad…</p>}
    </header>
    {data && <>
      <section aria-label="Resumen de uso" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[['Activos ahora',active],['Visitas a páginas',data.totals.views],['Visitantes estimados',data.totals.visitors],['Clics de descarga',data.totals.downloads]].map(([label,value]) => <div key={label} className="panel"><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-3xl font-black text-royal">{value}</p></div>)}
      </section>
      <section className="panel">
        <h2 className="text-xl font-black">Quién está en la página</h2>
        <p className="mt-2 text-sm text-slate-600">{data.online.length} visitantes con señal reciente; {active} activos y {data.online.length-active} inactivos. Activo = interacción en los últimos 2 minutos, con la página visible. Se retiran tras 75 segundos sin señal.</p>
        <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Usuario</th><th className="p-2">Sección</th><th className="p-2">Estado</th><th className="p-2">Última señal</th></tr></thead><tbody>
          {data.online.map(user => <tr key={user.key} className="border-b border-slate-100"><td className="p-2 font-semibold">{user.name}<span className="block text-xs font-normal text-slate-500">{user.registered ? 'Cuenta identificada' : 'Sin sesión iniciada'}</span></td><td className="p-2">{user.section}</td><td className="p-2"><span className={user.active ? 'font-bold text-emerald-700' : 'text-slate-500'}>{user.active ? 'Activo' : 'Inactivo'}</span></td><td className="p-2">{time(user.last_seen)}</td></tr>)}
        </tbody></table></div>
        {!data.online.length && <p className="mt-4 text-sm text-slate-500">No hay visitantes con señal reciente.</p>}
      </section>
      <section className="panel">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black">Lo más utilizado ahora</h2><select aria-label="Ventana de actividad reciente" value={minutes} onChange={e => setMinutes(Number(e.target.value))} className="rounded-lg border p-2"><option value={5}>Últimos 5 minutos</option><option value={30}>Últimos 30 minutos</option></select></div>
        <div className="mt-4 space-y-3">{data.popular.map(item => <div key={item.section}><div className="flex justify-between gap-2 text-sm"><strong>{item.section}</strong><span>{item.views} visitas · {item.visitors} visitantes</span></div><div className="mt-1 h-2 overflow-hidden rounded bg-blue-50"><div className="h-full rounded bg-royal" style={{width: (100*item.views/Math.max(1,...data.popular.map(p=>p.views)))+'%'}} /></div></div>)}</div>
        {!data.popular.length && <p className="mt-4 text-sm text-slate-500">Aún no hay visitas registradas en este intervalo.</p>}
      </section>
      <section className="panel"><h2 className="text-xl font-black">Historial diario</h2><p className="mt-2 text-sm text-slate-600">{data.totals.accounts} cuentas distintas en el periodo. Las visitas cuentan aperturas de página, no personas.</p>
        <div className="mt-4 max-h-72 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Fecha</th><th className="p-2">Visitas</th><th className="p-2">Visitantes estimados</th></tr></thead><tbody>{data.daily.map(day=><tr className="border-t" key={day.day}><td className="p-2">{day.day}</td><td className="p-2">{day.views}</td><td className="p-2">{day.visitors}</td></tr>)}</tbody></table></div>
        {!data.daily.length && <p className="mt-3 text-sm text-slate-500">El historial comienza cuando se publica esta función.</p>}
      </section>
      <section className="panel"><h2 className="text-xl font-black">Actividad reciente</h2><p className="mt-2 text-sm text-slate-600">Últimos 40 eventos del intervalo seleccionado. Un clic de descarga no confirma que el archivo haya terminado de descargarse.</p><ul className="mt-4 max-h-96 divide-y overflow-auto">{data.recent.map(event=><li key={event.id} className="py-3 text-sm"><div className="flex justify-between gap-3"><strong>{event.name}</strong><time className="text-xs text-slate-500">{time(event.created_at)}</time></div><p>{eventNames[event.event] ?? event.event} · {event.section}</p></li>)}</ul>{!data.recent.length && <p className="mt-3 text-sm text-slate-500">Todavía no hay eventos.</p>}</section>
      <p className="px-2 text-xs text-slate-300">Medición aproximada: excluye la administración y a quienes desactiven las estadísticas de navegación. No reconstruye visitas anteriores. La presencia de una cuenta se agrupa entre sus pestañas y dispositivos.</p>
    </>}
  </div>;
}
