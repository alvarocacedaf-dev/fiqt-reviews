export function SignatureMark() {
  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-40 rounded-xl bg-white/85 p-1.5 shadow-lg shadow-black/20 backdrop-blur-sm sm:bottom-5 sm:right-5 sm:p-2">
      <img
        src="/arc-farfan-signature.png"
        alt="Firma ARC Farfan"
        className="h-auto w-28 select-none sm:w-40"
      />
    </div>
  );
}
