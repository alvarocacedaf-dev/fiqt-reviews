'use client';

export function ConfirmRejectDonationButton() {
  return (
    <button
      className="rounded-xl bg-red-700 px-4 py-2.5 font-black text-white transition hover:bg-red-800"
      name="status"
      onClick={event => {
        const confirmed = window.confirm(
          '¿Estás seguro de que deseas rechazar este archivo? Esta acción eliminará permanentemente la plancha.',
        );
        if (!confirmed) event.preventDefault();
      }}
      type="submit"
      value="rejected"
    >
      Rechazar
    </button>
  );
}
