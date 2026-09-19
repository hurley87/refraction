'use client';

type MapLocateButtonProps = {
  isLocating: boolean;
  onLocate: () => void;
  className?: string;
};

export function MapLocateButton({
  isLocating,
  onLocate,
  className,
}: MapLocateButtonProps) {
  return (
    <button
      type="button"
      onClick={onLocate}
      disabled={isLocating}
      className={
        className ??
        'pointer-events-auto flex h-[55px] w-[55px] shrink-0 items-center justify-center gap-4 rounded-[1000px] border border-[var(--IRL-Yellow,#FFF200)] bg-[var(--IRL-Yellow,#FFF200)] px-3 py-2 shadow-[0_4px_16px_0_rgba(0,0,0,0.25)] backdrop-blur-[232px] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50'
      }
      aria-label={isLocating ? 'Locating...' : 'My Location'}
    >
      {isLocating ? (
        <svg
          className="size-6 shrink-0 animate-spin text-[#171717]"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={24}
          height={24}
          viewBox="0 0 24 24"
          fill="none"
          className="aspect-square size-6 shrink-0"
          aria-hidden="true"
        >
          <path
            d="M5.82333 16.099L3 18.9316L5.06064 21L7.87035 18.1797L9.87107 20.1196V14.1031H3.8771L5.82333 16.099Z"
            fill="#171717"
          />
          <path
            d="M11.9999 10.2014C11.0288 10.2014 10.2402 10.9916 10.2402 11.9677C10.2402 12.9438 11.0275 13.734 11.9999 13.734C12.9723 13.734 13.7595 12.9438 13.7595 11.9677C13.7595 10.9916 12.9723 10.2014 11.9999 10.2014Z"
            fill="#171717"
          />
          <path
            d="M16.1177 18.1661L18.9397 21L21.0004 18.9316L18.1906 16.1113L20.1233 14.1031H14.1279V20.1196L16.1177 18.1661Z"
            fill="#171717"
          />
          <path
            d="M18.1766 7.83501L21 5.00242L18.9393 2.93402L16.1296 5.75431L14.1289 3.81442V9.83095H20.1229L18.1766 7.83501Z"
            fill="#171717"
          />
          <path
            d="M7.88261 5.76798L5.06064 2.93402L3 5.00242L5.80971 7.82271L3.8771 9.83095H9.87107V3.81442L7.88261 5.76798Z"
            fill="#171717"
          />
        </svg>
      )}
    </button>
  );
}
