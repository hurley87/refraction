import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CityGuideArticleNav } from '@/components/city-guides/city-guide-article-nav';
import { CityGuideArticleDescription } from '@/components/city-guides/city-guide-article-description';
import { CityGuideArticleHeroImage } from '@/components/city-guides/city-guide-article-hero-image';
import { EditorialArticleBlocks } from '@/components/city-guides/editorial-article-blocks';
import { EditorialArticleMetaRow } from '@/components/city-guides/editorial-article-meta-row';
import { EditorialArticleTitle } from '@/components/city-guides/editorial-article-title';
import { GuideArticleContributorsSection } from '@/components/city-guides/guide-article-contributors-section';
import { getEditorialPageData, hubListTitle } from '@/lib/db/guides';

export const revalidate = 60;

type PageProps = { params: { slug: string } };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const data = await getEditorialPageData(params.slug);
  if (!data) {
    return { title: 'Editorial | IRL' };
  }
  const title = `${hubListTitle(data.row)} | IRL`;
  const description =
    data.row.card_preview?.trim() ||
    data.row.lead_headline?.trim() ||
    'IRL editorial';
  return { title, description };
}

export default async function EditorialBySlugPage({ params }: PageProps) {
  const data = await getEditorialPageData(params.slug);
  if (!data) {
    notFound();
  }

  const { row, contributors, contributorNames, blocks } = data;
  const leadParagraphs = row.lead_paragraphs?.filter((p) => p.trim()) ?? [];
  const headline = row.lead_headline?.trim() ?? '';

  return (
    <div className="min-h-screen w-full bg-[#F5F5F5] font-grotesk">
      <div className="mx-auto w-full max-w-[393px] rounded-[48px] bg-[var(--Backgrounds-Background,#FFF)] shadow-sm">
        <header className="sticky top-0 z-30 rounded-t-[48px] bg-[var(--Backgrounds-Background,#FFF)] pt-[max(8px,env(safe-area-inset-top))]">
          <CityGuideArticleNav />
        </header>

        <article className="px-4 pb-16 pt-2">
          <EditorialArticleTitle
            primary={row.title_primary?.trim() ?? ''}
            secondary={row.title_secondary?.trim() || undefined}
            className="mb-4"
          />

          <EditorialArticleMetaRow
            contributors={contributorNames}
            className="mb-8"
          />

          <CityGuideArticleHeroImage
            src={row.hero_image_url}
            alt={row.hero_image_alt}
            className="mb-[20px]"
          />

          {headline || leadParagraphs.length > 0 ? (
            <CityGuideArticleDescription
              headline={headline}
              paragraphs={leadParagraphs}
              className="mb-10"
            />
          ) : null}

          {contributors.length > 0 ? (
            <GuideArticleContributorsSection
              contributors={contributors}
              className="mb-10"
            />
          ) : null}

          <EditorialArticleBlocks blocks={blocks} />
        </article>
      </div>
    </div>
  );
}
