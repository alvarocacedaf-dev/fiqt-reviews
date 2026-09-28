function Skeleton({ className }: { className: string }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded-xl bg-slate-200/80 motion-reduce:animate-none ${className}`} />;
}

function LoadingRegion({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div aria-busy="true" aria-live="polite" className="w-full">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

function DarkHeaderSkeleton() {
  return (
    <section className="mb-6 rounded-[1.5rem] border border-white/15 bg-[#071a3d]/85 p-6 shadow-card sm:p-8">
      <Skeleton className="h-3 w-24 bg-blue-300/35" />
      <Skeleton className="mt-4 h-9 w-3/5 max-w-xl bg-white/20" />
      <Skeleton className="mt-4 h-4 w-full max-w-2xl bg-blue-200/20" />
      <Skeleton className="mt-2 h-4 w-4/5 max-w-xl bg-blue-200/20" />
    </section>
  );
}

export function AcademicRouteLoading() {
  return (
    <LoadingRegion label="Cargando ruta académica y recompensas…">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-6">
          <section className="panel">
            <Skeleton className="h-4 w-32 bg-blue-200" />
            <Skeleton className="mt-3 h-9 w-64" />
            <Skeleton className="mt-3 h-4 w-full max-w-lg" />
            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {Array.from({ length: 10 }, (_, index) => (
                <div className="surface-card flex h-[72px] items-center gap-3 p-4" key={index}>
                  <Skeleton className="h-9 w-9 shrink-0 rounded-full bg-blue-100" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </section>
          <div className="flex gap-3">
            <Skeleton className="h-11 w-40 bg-white/15" />
            <Skeleton className="h-11 w-40 bg-white/15" />
          </div>
          <section className="rounded-2xl border border-white/15 bg-white/10 p-5">
            <Skeleton className="h-4 w-52 bg-amber-200/35" />
            <Skeleton className="mt-4 h-20 w-full bg-white/10" />
            <Skeleton className="mt-3 h-20 w-full bg-white/10" />
          </section>
        </div>

        <aside className="rounded-2xl border border-white/15 bg-[#071a3d]/85 p-5 shadow-card">
          <Skeleton className="h-4 w-40 bg-amber-200/35" />
          <Skeleton className="mt-4 h-7 w-full bg-white/20" />
          <Skeleton className="mt-2 h-7 w-4/5 bg-white/20" />
          <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.06] p-4">
            <Skeleton className="h-4 w-36 bg-white/20" />
            <Skeleton className="mt-4 h-3 w-full rounded-full bg-white/15" />
            <Skeleton className="mt-4 h-4 w-4/5 bg-white/15" />
          </div>
          <div className="mt-5 space-y-3">
            {Array.from({ length: 5 }, (_, index) => <Skeleton className="h-[66px] w-full bg-white/10" key={index} />)}
          </div>
        </aside>
      </div>
    </LoadingRegion>
  );
}

export function CoursesLoading() {
  return (
    <LoadingRegion label="Cargando cursos…">
      <DarkHeaderSkeleton />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }, (_, index) => (
          <article className="surface-card h-[142px] p-5" key={index}>
            <div className="flex justify-between gap-4">
              <div className="flex-1">
                <Skeleton className="h-3 w-20 bg-blue-200" />
                <Skeleton className="mt-3 h-5 w-4/5" />
              </div>
              <Skeleton className="h-9 w-9 bg-blue-100" />
            </div>
            <Skeleton className="mt-6 h-3 w-28" />
          </article>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function ProfessorCardsLoading() {
  return (
    <LoadingRegion label="Cargando profesores y reseñas…">
      <DarkHeaderSkeleton />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <article className="min-h-[29rem] rounded-[2.25rem] border-4 border-white bg-gradient-to-br from-white via-blue-50 to-blue-100 p-6 shadow-card" key={index}>
            <Skeleton className="mx-auto mt-10 h-28 w-28 rounded-3xl bg-blue-100" />
            <Skeleton className="mx-auto mt-5 h-6 w-3/5" />
            <Skeleton className="mx-auto mt-3 h-4 w-2/5 bg-blue-100" />
            <div className="mt-5 rounded-2xl border border-blue-100 bg-white/70 p-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-3 h-7 w-32 bg-blue-100" />
              <Skeleton className="mt-2 h-4 w-44" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Skeleton className="h-11 w-full bg-blue-200" />
              <Skeleton className="h-11 w-full" />
            </div>
          </article>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function MaterialsLoading() {
  return (
    <LoadingRegion label="Cargando materiales del curso…">
      <DarkHeaderSkeleton />
      <div className="space-y-4">
        {Array.from({ length: 5 }, (_, index) => (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" key={index}>
            <div className="flex items-center gap-4 p-5">
              <Skeleton className="h-12 w-12 shrink-0 bg-blue-100" />
              <div className="flex-1">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="mt-2 h-3 w-32" />
              </div>
              <Skeleton className="h-8 w-8 bg-blue-100" />
            </div>
            {index === 0 && (
              <div className="space-y-3 border-t border-slate-200 bg-slate-50 p-5">
                {Array.from({ length: 3 }, (_, row) => (
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4" key={row}>
                    <Skeleton className="h-9 w-9 shrink-0 bg-blue-100" />
                    <div className="flex-1"><Skeleton className="h-4 w-3/5" /><Skeleton className="mt-2 h-3 w-28" /></div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function ProfessorProfileLoading() {
  return (
    <LoadingRegion label="Cargando perfil y reseñas del profesor…">
      <div className="space-y-6">
        <section className="panel flex flex-col justify-between gap-5 sm:flex-row">
          <div className="flex-1"><Skeleton className="h-4 w-28 bg-blue-200" /><Skeleton className="mt-3 h-9 w-72" /><Skeleton className="mt-4 h-4 w-full max-w-xl" /></div>
          <div className="surface-muted min-w-48 p-4"><Skeleton className="h-7 w-24 bg-blue-100" /><Skeleton className="mt-3 h-4 w-36" /></div>
        </section>
        <section className="panel">
          <Skeleton className="h-6 w-64" />
          <div className="mt-5 space-y-4">
            {Array.from({ length: 4 }, (_, index) => (
              <article className="surface-card p-4" key={index}>
                <div className="flex justify-between"><Skeleton className="h-4 w-32 bg-blue-100" /><Skeleton className="h-6 w-28 bg-blue-100" /></div>
                <Skeleton className="mt-4 h-4 w-full" /><Skeleton className="mt-2 h-4 w-4/5" />
                <div className="mt-4 flex gap-2"><Skeleton className="h-7 w-24 bg-blue-100" /><Skeleton className="h-7 w-32 bg-blue-100" /></div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </LoadingRegion>
  );
}

export function ScheduleBuilderLoading({ saved = false }: { saved?: boolean }) {
  return (
    <LoadingRegion label={saved ? 'Cargando horario guardado…' : 'Cargando armador de horarios…'}>
      <div className="space-y-6">
        <section className="rounded-[1.5rem] border border-white/15 bg-[#071a3d]/85 px-6 py-8 shadow-card sm:px-10 sm:py-11">
          <Skeleton className="h-4 w-56 bg-amber-200/35" />
          <Skeleton className="mt-5 h-11 w-3/5 bg-white/20" />
          <Skeleton className="mt-4 h-4 w-full max-w-2xl bg-blue-200/20" />
          <Skeleton className="mt-2 h-4 w-4/5 max-w-xl bg-blue-200/20" />
        </section>
        {!saved && <div className="grid gap-3 sm:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <Skeleton className="h-[58px] w-full bg-white/10" key={index} />)}</div>}
        <section className="panel">
          <div className="flex justify-between gap-4"><Skeleton className="h-7 w-52" /><Skeleton className="h-10 w-36 bg-blue-100" /></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: saved ? 3 : 9 }, (_, index) => <Skeleton className="h-16 w-full" key={index} />)}
          </div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-white/15 bg-[#071a3d]/85 p-5">
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 49 }, (_, index) => <Skeleton className="h-8 w-full rounded-md bg-white/10" key={index} />)}
          </div>
        </section>
      </div>
    </LoadingRegion>
  );
}
