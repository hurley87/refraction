'use client';

/**
 * Artist CTA card: gradient panel listing the IRL artist network.
 * Mobile: 3 columns · Desktop (xl+): 6 columns, divided equally.
 */
const ARTIST_COLUMNS: string[][] = [
  [
    'AHADADREAM',
    'AKIKO NAKAYAMA',
    'ANA CABALLERO',
    'ANDY ROLFES',
    'ANNA LUCIA',
    'ASH LAURYN',
    'BECKA SAVILLE',
    'BENJI B',
    'BITTER BABE',
    'BONGOMANN',
    'BRADLEY ZERO',
    'CAVALLI BASTOS',
    'CIBELLE',
    'CIEL',
    'CLAIRE SILVER',
    'DANNY DAZE',
    'DARWIN',
    'DAVE KRUGMAN',
    'DEADBEAT',
    'DEBIT',
    'DINA CHANG',
    'DJ BORING',
    'DJ D DEE',
    'DJ PYTHON',
    'DJ SPHINX',
    'DJ WAWA',
    'DOSS',
    'DREAMCASTMOE',
    'FELT ZINE',
    'FLORIST',
    'HONEYDRIP',
    'IKARO CAVALCANTE',
    'INVT',
  ],
  [
    'IX SHELLS',
    'JACKSON KAKI',
    'JIMMY EDGAR',
    'JONATHAN KUSUMA',
    'JUBILEE',
    'KAZUHIRO AIHARA',
    'KIM ASENDORF',
    'KONTRANATURA',
    'KRISTINE BARILLI',
    'LATASHA',
    'LEANDER HERZOG',
    'LINDA DOUNIA',
    'LORNA MILLS',
    'LORRAINE JAMES',
    'MACHINA',
    'MALCOLM LEVY',
    'MANAMI SAKAMOTO',
    'MARIE DAVIDSON',
    'MARIE MONTEXIER',
    'MATHEW JONSON',
    'MC YALLAH',
    'MOVE D',
    'MUQATA’A',
    'MUSCLECARS',
    'NATE BOYCE',
    'NATHANIEL STERN',
    'NICOLAS SASSOON',
    'NOAH PRED',
    'NYGILIA',
    'OPERATOR',
    'OPIUM HUM',
    'PACIFIC RHYTHM',
    'PANTHER MODERN',
  ],
  [
    'PATRICK HOLLAND',
    'PEACH',
    'PHILLIP D STEARNS',
    'PIXELFOOL',
    'PORTRAIT XO',
    'PRIORI',
    'RANDOM PATTERN',
    'REGULAR FANTASY',
    'RICK SILVA',
    'ROBERT GALLARDO',
    'RON TRENT',
    'RUSSELL E L BUTLER',
    'SAOIRSE',
    'SARAH MOOSVI',
    'SASHA STILES',
    'SCOTT KILDALL',
    'SCOTCH ROLEX',
    'SEANCE CENTRE',
    'SEB WILDBLOOD',
    'SKY GOODMAN',
    'SKYE NICOLAS',
    'SOUL CLAP',
    'SPACE AFRIKA',
    'SUREN SENEVIRATNE',
    'TEEN DAZE',
    'TIGA',
    'TIJANA T',
    'TIM SACCENTI',
    'TORIBIO',
    'YAEJI',
    'YOSHI SODEOKA',
    'YU SU',
  ],
];

const ARTISTS = ARTIST_COLUMNS.flat();

/** Split items into `count` columns with sizes differing by at most one. */
function splitIntoColumns<T>(items: readonly T[], count: number): T[][] {
  const columnSize = Math.ceil(items.length / count);
  return Array.from({ length: count }, (_, index) =>
    items.slice(index * columnSize, (index + 1) * columnSize)
  ).filter((column) => column.length > 0);
}

const MOBILE_ARTIST_COLUMNS = splitIntoColumns(ARTISTS, 3);
const DESKTOP_ARTIST_COLUMNS = splitIntoColumns(ARTISTS, 6);

function ArtistNameColumns({
  columns,
  className,
}: {
  columns: string[][];
  className?: string;
}) {
  return (
    <div className={className}>
      {columns.map((column) => (
        <div
          key={column[0]}
          className="label-small flex w-[109px] flex-col gap-0 xl:min-w-0 xl:flex-1 xl:w-auto"
        >
          {column.map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function ArtistCTA() {
  return (
    <section className="relative flex w-full justify-center bg-[#131313]">
      <div
        className="flex h-[964px] w-full flex-col items-center justify-center"
        style={{
          background:
            'linear-gradient(90deg, #D7D7D7 0.48%, #B3B3B3 37.02%, #919191 79.81%)',
        }}
      >
        <div className="flex w-[361px] max-w-full flex-col items-start gap-[14px] text-[#171717] xl:w-full xl:max-w-[1100px] xl:items-center xl:px-8">
          {/* Row 1: heading */}
          <h3 className="self-stretch xl:mx-auto xl:w-[952px] xl:max-w-full xl:font-['Special_Gothic_SemiExpanded',sans-serif] xl:text-[42px] xl:font-medium xl:leading-[40px] xl:pb-[48px]">
            The IRL is an ever-expanding network of 2000+ DJs, musicians, and
            visual artists.
          </h3>

          {/* Artist names — 3 columns mobile, 6 columns desktop */}
          <ArtistNameColumns
            columns={MOBILE_ARTIST_COLUMNS}
            className="flex w-full justify-between xl:hidden"
          />
          <ArtistNameColumns
            columns={DESKTOP_ARTIST_COLUMNS}
            className="hidden w-full justify-between gap-4 xl:flex label-large"
          />
        </div>
      </div>
    </section>
  );
}
