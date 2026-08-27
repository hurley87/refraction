import { readFile } from 'fs/promises';
import { join } from 'path';
import { ImageResponse } from 'next/og';
import {
  buildPublicListOgCard,
  publicListOgSatoriPhotoUrl,
  resolvePublicListForSharePage,
  type PublicListOgCard,
} from '@/lib/player-lists/public-list-og-card';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const alt = 'IRL list';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const IRL_BLACK = '#171717';
const IRL_YELLOW = '#FFF200';
const IRL_GRAY = '#757575';
const CANVAS_INSET = 44;
const CARD_RADIUS = 44;
const CARD_PADDING = 28;
const CARD_HEIGHT = size.height - CANVAS_INSET * 2;
const FOOTER_HEIGHT = 104;
const THUMBNAIL_WIDTH = 470;
const THUMBNAIL_HEIGHT = CARD_HEIGHT - CARD_PADDING * 2 - FOOTER_HEIGHT;
const THUMBNAIL_RADIUS = 28;
const PHOTO_FETCH_TIMEOUT_MS = 5000;

type OgImageParams = {
  params?: { username?: string; listSlug?: string };
};

const FONT_REGULAR = join(
  process.cwd(),
  'public/fonts/Special Gothic Expanded Regular.otf'
);
const FONT_MEDIUM = join(
  process.cwd(),
  'public/fonts/SpecialSemi-ExpandedMedium.otf'
);
const LOGO_SVG = join(process.cwd(), 'public/irl-svg/irl-logo-new.svg');

function svgDataUri(svg: Buffer): string {
  return `data:image/svg+xml;base64,${svg.toString('base64')}`;
}

/**
 * Inlines the list photo as a PNG/JPEG/GIF data URI.
 *
 * Satori only decodes those formats. Location uploads are stored as WebP, so
 * we first convert Supabase URLs through image transforms instead of sharp.
 * A slow host must not stall the card, so the fetch is time-boxed and any
 * failure falls back to the branded no-photo panel.
 */
async function loadPhotoDataUri(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(PHOTO_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') ?? '';
    if (!/image\/(png|jpeg|jpg|gif)\b/i.test(contentType)) return null;

    const mime = contentType.split(';')[0]?.trim() || 'image/jpeg';
    const bytes = Buffer.from(await response.arrayBuffer());
    return `data:${mime};base64,${bytes.toString('base64')}`;
  } catch {
    return null;
  }
}

async function loadFonts(): Promise<
  { name: string; data: Buffer; style: 'normal'; weight: 400 | 500 }[]
> {
  const [regular, medium] = await Promise.all([
    readFile(FONT_REGULAR),
    readFile(FONT_MEDIUM),
  ]);
  return [
    {
      name: 'Special Gothic',
      data: regular,
      style: 'normal',
      weight: 400,
    },
    {
      name: 'Special Gothic',
      data: medium,
      style: 'normal',
      weight: 500,
    },
  ];
}

/** Keeps long list names inside the card's text column without clipping. */
function titleFontSize(title: string): number {
  if (title.length <= 10) return 92;
  if (title.length <= 18) return 72;
  if (title.length <= 30) return 58;
  if (title.length <= 46) return 46;
  return 38;
}

function ShareCard({
  card,
  photoSrc,
  logoSrc,
}: {
  card: PublicListOgCard | null;
  photoSrc: string | null;
  logoSrc: string;
}) {
  const title = card?.title ?? 'IRL';
  const ownerLabel = card?.ownerLabel ?? '';

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        padding: CANVAS_INSET,
        backgroundColor: '#F5F5F5',
        fontFamily: 'Special Gothic',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          borderRadius: CARD_RADIUS,
          backgroundColor: '#ffffff',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.18)',
          padding: CARD_PADDING,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'row', flex: 1 }}>
          {photoSrc ? (
            <img
              src={photoSrc}
              width={THUMBNAIL_WIDTH}
              height={THUMBNAIL_HEIGHT}
              alt=""
              style={{
                width: THUMBNAIL_WIDTH,
                height: THUMBNAIL_HEIGHT,
                objectFit: 'cover',
                borderRadius: THUMBNAIL_RADIUS,
              }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                width: THUMBNAIL_WIDTH,
                height: THUMBNAIL_HEIGHT,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: IRL_YELLOW,
                borderRadius: THUMBNAIL_RADIUS,
              }}
            >
              <img src={logoSrc} width={168} height={151} alt="" />
            </div>
          )}

          <div
            style={{
              display: 'flex',
              flex: 1,
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '12px 20px 12px 40px',
            }}
          >
            <img src={logoSrc} width={132} height={119} alt="" />

            <div
              style={{
                display: 'flex',
                fontSize: 40,
                color: IRL_GRAY,
              }}
            >
              {card ? 'Check out my list:' : "Culture's rewards program"}
            </div>

            <div
              style={{
                display: 'flex',
                fontSize: titleFontSize(title),
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                color: IRL_BLACK,
              }}
            >
              {title}
            </div>

            {ownerLabel ? (
              <div
                style={{
                  display: 'flex',
                  fontSize: 38,
                  color: IRL_GRAY,
                }}
              >
                {`- ${ownerLabel}`}
              </div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            height: FOOTER_HEIGHT,
            paddingTop: 20,
            borderTop: '2px solid #DBDBDB',
          }}
        >
          <div style={{ display: 'flex', fontSize: 30, color: IRL_BLACK }}>
            {card
              ? `${title} - ${ownerLabel}'s curated list`
              : 'Discover culture worth showing up for'}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginTop: 10,
              fontSize: 28,
            }}
          >
            <div
              style={{
                display: 'flex',
                padding: '2px 10px',
                borderRadius: 6,
                backgroundColor: IRL_YELLOW,
                color: IRL_BLACK,
              }}
            >
              irl
            </div>
            <div style={{ display: 'flex', color: IRL_BLACK }}>.energy</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function Image({ params }: OgImageParams) {
  const [fonts, logoSvg] = await Promise.all([loadFonts(), readFile(LOGO_SVG)]);
  const logoSrc = svgDataUri(logoSvg);

  let card: PublicListOgCard | null = null;
  let photoSrc: string | null = null;
  try {
    const list = await resolvePublicListForSharePage(
      params?.username ?? '',
      params?.listSlug ?? ''
    );
    card = list ? buildPublicListOgCard(list) : null;
    photoSrc = await loadPhotoDataUri(
      publicListOgSatoriPhotoUrl(card?.photoUrl ?? null)
    );
  } catch {
    card = null;
    photoSrc = null;
  }

  return new ImageResponse(
    <ShareCard card={card} photoSrc={photoSrc} logoSrc={logoSrc} />,
    {
      ...size,
      fonts,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    }
  );
}
