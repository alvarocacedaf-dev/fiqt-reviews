'use client';
import { useEffect, useState } from 'react';
export function ActivityPreference() {
  const [disabled, setDisabled] = useState<boolean | null>(null);
  const [dnt, setDnt] = useState(false);
  useEffect(() => { setDisabled(localStorage.getItem('fiqt-activity-optout') === '1'); setDnt(navigator.doNotTrack === '1'); }, []);
  if (disabled === null) return null;
  return <div className="mt-5 rounded-xl bg-blue-50 p-4">
    <p>Estadísticas de navegación en este navegador: <strong>{disabled || dnt ? 'desactivadas' : 'activadas'}</strong>.</p>
    {dnt ? <p>Se respeta la señal «No rastrear» de tu navegador.</p> : <button className="btn-primary mt-3" type="button" onClick={() => {
      localStorage.setItem('fiqt-activity-optout', disabled ? '0' : '1');
      setDisabled(!disabled); window.dispatchEvent(new Event('fiqt-activity-preference'));
    }}>{disabled ? 'Activar estadísticas' : 'Desactivar estadísticas'}</button>}
    <p className="mt-2 text-sm">Esta preferencia no cambia tu acceso ni impide enviar reseñas, verificaciones o aportes.</p>
  </div>;
}
