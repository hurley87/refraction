'use client';

type MapErrorOverlayProps = {
  mapRenderError: string | null;
};

export function MapErrorOverlay({ mapRenderError }: MapErrorOverlayProps) {
  if (!mapRenderError) return null;

  return (
    <div
      role="alert"
      className="pointer-events-auto absolute inset-0 z-[25] flex items-center justify-center bg-black/80 px-4 py-8 text-center"
    >
      <p className="max-w-md text-sm leading-relaxed text-white">
        {mapRenderError}
      </p>
    </div>
  );
}
