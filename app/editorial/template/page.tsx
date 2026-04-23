import type { Metadata } from 'next';

import { CityGuideArticleNav } from '@/components/city-guides/city-guide-article-nav';
import { CityGuideArticleDescription } from '@/components/city-guides/city-guide-article-description';
import { CityGuideArticleHeroImage } from '@/components/city-guides/city-guide-article-hero-image';
import {
  EditorialArticleBlocks,
  type EditorialContentBlock,
} from '@/components/city-guides/editorial-article-blocks';
import { EditorialArticleMetaRow } from '@/components/city-guides/editorial-article-meta-row';
import { EditorialArticleTitle } from '@/components/city-guides/editorial-article-title';
import { GuideArticleContributorsSection } from '@/components/city-guides/guide-article-contributors-section';

export const metadata: Metadata = {
  title: 'Editorial template | IRL',
  description:
    'Layout template for an editorial article — populate from CMS when ready.',
};

/** Replace with CMS: up to two short `title1` lines — primary bold, secondary medium (optional). */
const TEMPLATE_TITLE = {
  primary: 'The IRL Dispatch — Montréal',
  secondary: 'One week in the digital village',
  contributors: ['Avery Chen'] as const,
};

const TEMPLATE_HERO = {
  heroImageSrc: '/case-studies/mutek-montreal/1S1A0218.jpg',
  heroImageAlt: 'Crowd and stage lights at an electronic music festival',
} as const;

/** Author cards; align names with `TEMPLATE_TITLE.contributors` when wiring CMS. */
const TEMPLATE_EDITORIAL_CONTRIBUTORS = [
  {
    name: 'Avery Chen',
    bio: 'Avery writes about experimental music and digital art, with a focus on how festivals reframe public space.',
    photoSrc: '/homepage/city-guides-covers/danielle-guide.jpg',
    photoAlt: 'Avery Chen',
    instagramHref: 'https://www.instagram.com/refraction_irl/',
  },
] as const;

/** Intro: Title4 headline + body-medium paragraphs (city-guide pattern). */
const TEMPLATE_LEAD_HEADLINE =
  'MUTEK’s digital village turned a parking structure into a laboratory for light, sound, and play.';
const TEMPLATE_LEAD_PARAGRAPHS = [
  'Over one humid week, corridors became stages, stairwells became speaker stacks, and the line between installation and party thinned until it disappeared.',
];

/**
 * Sample CMS stream: interleaved paragraphs, title3 / display-scale headings, and 4:5 frames.
 * Replace with API / portable text when the admin CMS ships.
 */
const TEMPLATE_EDITORIAL_BLOCKS: EditorialContentBlock[] = [
  {
    type: 'paragraph',
    text: 'We arrived on a Thursday when the city still smelled like rain. Volunteers in reflective vests waved us toward a side entrance; inside, the air was cooler and already carried a faint pulse of sub-bass from a rehearsal somewhere below.',
  },
  {
    type: 'subtitleTitle3',
    text: 'First impressions',
  },
  {
    type: 'paragraph',
    text: 'The program was printed on newsprint and gone within an hour. That felt intentional: nothing about the weekend was meant to feel permanent except the conversations you carried home.',
  },
  {
    type: 'image',
    src: '/case-studies/mutek-montreal/1S1A8722.jpg',
    alt: 'Abstract stage lighting and silhouettes of performers',
    caption: 'Village numérique — evening program, MUTEK 2025',
  },
  {
    type: 'paragraph',
    text: 'By midnight the main room was a single gradient of violet and copper. People leaned on railings as if the building itself were listening.',
  },
  {
    type: 'subtitleDisplay',
    text: 'When the floor became the interface',
  },
  {
    type: 'paragraph',
    text: 'A handful of works asked the audience to move differently: slower, closer, more deliberate. Security staff learned the choreography too, stepping back when a piece needed silence.',
  },
  {
    type: 'paragraph',
    text: 'Kids on shoulders, artists crouched beside cables, photographers swapping batteries mid-set — the usual festival entropy, but calmer, as if everyone agreed the stakes were curiosity, not clout.',
  },
  {
    type: 'image',
    src: '/homepage/cities/montreal.jpg',
    alt: 'Montreal city skyline at dusk',
    caption: 'Montréal — context for the weekend’s sprawl',
  },
  {
    type: 'subtitleTitle3',
    text: 'Small rooms, loud ideas',
  },
  {
    type: 'paragraph',
    text: 'The side stages were barely wider than a shipping container. You could read the mixer labels from the third row, which made technical choices feel as legible as lyrics.',
  },
  {
    type: 'paragraph',
    text: 'One artist ran a patch that spat granular shards whenever someone crossed a taped line on the floor; another slowed everything until the room sounded like a held breath.',
  },
  {
    type: 'image',
    src: '/case-studies/mutek-montreal/1S1A9751.jpg',
    alt: 'Festival attendees in an industrial venue space',
    caption: 'Late set — photo: Tannaz Shirazi',
  },
  {
    type: 'subtitleDisplay',
    text: 'What we’re taking with us',
  },
  {
    type: 'paragraph',
    text: 'If there is a thesis, it might be this: festivals do not need to grow outward to grow deeper. A parking garage, treated as architecture instead of filler, can hold as much meaning as an opera house — as long as the curators trust the crowd to follow.',
  },
  {
    type: 'paragraph',
    text: 'We left with ringing ears and a folded map covered in pencil marks: arrows, question marks, and one word underlined twice — “again.”',
  },
];

export default function EditorialTemplatePage() {
  return (
    <div className="min-h-screen w-full bg-[#F5F5F5] font-grotesk">
      <div className="mx-auto w-full max-w-[393px] rounded-[48px] bg-[var(--Backgrounds-Background,#FFF)] shadow-sm">
        <header className="sticky top-0 z-30 rounded-t-[48px] bg-[var(--Backgrounds-Background,#FFF)] pt-[max(8px,env(safe-area-inset-top))]">
          <CityGuideArticleNav />
        </header>

        <article className="px-4 pb-16 pt-2">
          <EditorialArticleTitle
            primary={TEMPLATE_TITLE.primary}
            secondary={TEMPLATE_TITLE.secondary}
            className="mb-4"
          />

          <EditorialArticleMetaRow
            contributors={[...TEMPLATE_TITLE.contributors]}
            className="mb-8"
          />

          <CityGuideArticleHeroImage
            src={TEMPLATE_HERO.heroImageSrc}
            alt={TEMPLATE_HERO.heroImageAlt}
            className="mb-[20px]"
          />

          <CityGuideArticleDescription
            headline={TEMPLATE_LEAD_HEADLINE}
            paragraphs={TEMPLATE_LEAD_PARAGRAPHS}
            className="mb-10"
          />

          <GuideArticleContributorsSection
            contributors={TEMPLATE_EDITORIAL_CONTRIBUTORS}
            className="mb-10"
          />

          <EditorialArticleBlocks blocks={TEMPLATE_EDITORIAL_BLOCKS} />
        </article>
      </div>
    </div>
  );
}
