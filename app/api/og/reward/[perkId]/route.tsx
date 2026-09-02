import { ImageResponse } from 'next/og';
import {
  loadOgCardFonts,
  loadOgCardLogoDataUri,
  loadOgCardPhotoDataUri,
  ogCardPhotoUrl,
  OG_CARD_FONT_FAMILY,
  OG_CARD_SIZE,
} from '@/lib/og/satori-card-assets';
import {
  buildPerkShareCard,
  type PerkShareCard,
} from '@/lib/perks/perk-share-card';
import { loadShareablePerk } from '@/lib/perks/shareable-perk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const IRL_BLACK = '#171717';
const IRL_YELLOW = '#FFF200';
const IRL_GRAY = '#757575';
/** Small margin so the card's shadow has room without a wide gray border. */
const CANVAS_INSET = 14;
const CARD_RADIUS = 44;
const CARD_PADDING = 28;
const CARD_HEIGHT = OG_CARD_SIZE.height - CANVAS_INSET * 2;
const FOOTER_HEIGHT = 104;
const THUMBNAIL_WIDTH = 470;
const THUMBNAIL_HEIGHT = CARD_HEIGHT - CARD_PADDING * 2 - FOOTER_HEIGHT;
const THUMBNAIL_RADIUS = 28;

/** Keeps long reward names inside the card's text column without clipping. */
function titleFontSize(title: string): number {
  if (title.length <= 10) return 84;
  if (title.length <= 18) return 68;
  if (title.length <= 30) return 54;
  if (title.length <= 46) return 44;
  return 36;
}

function RewardShareCard({
  card,
  photoSrc,
  logoSrc,
}: {
  card: PerkShareCard | null;
  photoSrc: string | null;
  logoSrc: string;
}) {
  const title = card?.title ?? 'IRL';

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        padding: CANVAS_INSET,
        backgroundColor: '#F5F5F5',
        fontFamily: OG_CARD_FONT_FAMILY,
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
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.10)',
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

            <div style={{ display: 'flex', fontSize: 40, color: IRL_GRAY }}>
              {card ? 'Member reward:' : "Culture's rewards program"}
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

            {card?.venueLabel ? (
              <div style={{ display: 'flex', fontSize: 38, color: IRL_GRAY }}>
                {card.venueLabel}
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
            {card ? card.pointsLabel : 'Discover culture worth showing up for'}
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

/** GET /api/og/reward/[perkId] — branded share card for a single reward. */
export async function GET(
  _request: Request,
  { params }: { params: { perkId: string } }
) {
  const [fonts, logoSrc] = await Promise.all([
    loadOgCardFonts(),
    loadOgCardLogoDataUri(),
  ]);

  let card: PerkShareCard | null = null;
  let photoSrc: string | null = null;
  try {
    const perk = await loadShareablePerk(params.perkId ?? '');
    card = perk ? buildPerkShareCard(perk) : null;
    photoSrc = await loadOgCardPhotoDataUri(
      ogCardPhotoUrl(card?.photoUrl ?? null)
    );
  } catch {
    card = null;
    photoSrc = null;
  }

  return new ImageResponse(
    <RewardShareCard card={card} photoSrc={photoSrc} logoSrc={logoSrc} />,
    {
      ...OG_CARD_SIZE,
      fonts,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    }
  );
}
