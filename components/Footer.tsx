export function Footer() {
  return (
    <footer className="border-t border-white/15 bg-[#051530] px-6 py-5 text-blue-100">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <p className="text-xs leading-5">
          FIQT Reviews es un proyecto estudiantil independiente. No pertenece ni representa oficialmente a la
          Universidad Nacional de Ingeniería. Las reseñas reflejan experiencias académicas de estudiantes y pasan por
          moderación. No se permiten insultos, acusaciones personales ni contenido discriminatorio.
        </p>

        <img
          src="/arc-farfan-signature.png"
          alt="Firma ARC Farfan"
          className="h-auto w-24 shrink-0 select-none sm:-mr-24 sm:w-32"
        />
      </div>
    </footer>
  );
}
