'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Eye,
  Loader2,
  Trash2,
  ChevronUp,
  ChevronDown,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AdminGuideDetail } from '@/lib/db/guides';
import type { LocationListWithCount } from '@/lib/types';
import {
  parseEditorialBlocks,
  type EditorialContentBlock,
} from '@/lib/guides/block-schema';
import { CityGuidesHubCardImage } from '@/components/city-guides/city-guides-hub-card-image';

const GUIDES_ADMIN_KEY = ['admin-guides'] as const;

type ContributorForm = {
  position: number;
  name: string;
  bio: string;
  photo_url: string;
  photo_alt: string;
  instagram_href: string;
};

function emptyBlock(
  type: EditorialContentBlock['type']
): EditorialContentBlock {
  switch (type) {
    case 'paragraph':
      return { type: 'paragraph', text: '' };
    case 'subtitleTitle3':
      return { type: 'subtitleTitle3', text: '' };
    case 'subtitleH1':
      return { type: 'subtitleH1', text: '' };
    case 'image':
      return { type: 'image', src: '', alt: '', caption: '' };
    default:
      return { type: 'paragraph', text: '' };
  }
}

export default function AdminGuideEditPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const { user, login } = usePrivy();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);

  const checkAdminStatus = useCallback(async () => {
    if (!user?.email?.address) return false;
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email.address }),
      });
      const responseData = await response.json();
      const data = responseData.data || responseData;
      return data.isAdmin;
    } catch {
      return false;
    }
  }, [user?.email?.address]);

  useEffect(() => {
    const verify = async () => {
      if (user?.email?.address) {
        setIsAdmin(await checkAdminStatus());
        setAdminLoading(false);
      } else if (user === null) {
        setIsAdmin(false);
        setAdminLoading(false);
      }
    };
    void verify();
  }, [user, checkAdminStatus]);

  const adminEmail = user?.email?.address || '';

  const { data: lists = [] } = useQuery<LocationListWithCount[]>({
    queryKey: ['admin-location-lists'],
    queryFn: async () => {
      const response = await fetch('/api/admin/location-lists', {
        headers: { 'x-user-email': adminEmail },
      });
      if (!response.ok) throw new Error('Failed to load lists');
      const responseData = await response.json();
      const data = responseData.data || responseData;
      return data.lists ?? [];
    },
    enabled: !!isAdmin,
  });

  const { data: detail, isLoading } = useQuery<AdminGuideDetail | null>({
    queryKey: ['admin-guide', id],
    queryFn: async () => {
      const response = await fetch(`/api/admin/guides/${id}`, {
        headers: { 'x-user-email': adminEmail },
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error('Failed to load guide');
      const responseData = await response.json();
      const data = responseData.data || responseData;
      return data as AdminGuideDetail;
    },
    enabled: !!isAdmin && !!id,
  });

  const guide = detail?.guide ?? null;

  const [slug, setSlug] = useState('');
  const [titlePrefix, setTitlePrefix] = useState('');
  const [cityName, setCityName] = useState('');
  const [titlePrimary, setTitlePrimary] = useState('');
  const [titleSecondary, setTitleSecondary] = useState('');
  const [heroUrl, setHeroUrl] = useState('');
  const [heroAlt, setHeroAlt] = useState('');
  const [leadHeadline, setLeadHeadline] = useState('');
  const [leadParagraphsText, setLeadParagraphsText] = useState('');
  const [locationListId, setLocationListId] = useState<string>('');
  const [mapUrl, setMapUrl] = useState('');
  const [mapAlt, setMapAlt] = useState('');
  const [mapImageUploading, setMapImageUploading] = useState(false);
  const mapFileInputRef = useRef<HTMLInputElement>(null);
  const [heroImageUploading, setHeroImageUploading] = useState(false);
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const [cardPreview, setCardPreview] = useState('');
  const [cardImageUrl, setCardImageUrl] = useState('');
  const [cardImageAlt, setCardImageAlt] = useState('');
  const [cardImageUploading, setCardImageUploading] = useState(false);
  const cardFileInputRef = useRef<HTMLInputElement>(null);
  const [featuredPeopleText, setFeaturedPeopleText] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [publishedAt, setPublishedAt] = useState('');
  const [contributors, setContributors] = useState<ContributorForm[]>([]);
  const [contributorPhotoUploadingIndex, setContributorPhotoUploadingIndex] =
    useState<number | null>(null);
  const [blockImageUploadingIndex, setBlockImageUploadingIndex] = useState<
    number | null
  >(null);
  const [blocks, setBlocks] = useState<EditorialContentBlock[]>([]);

  useEffect(() => {
    if (!guide) return;
    setSlug(guide.slug);
    setTitlePrefix(guide.title_prefix ?? '');
    setCityName(guide.city_name ?? '');
    setTitlePrimary(guide.title_primary ?? '');
    setTitleSecondary(guide.title_secondary ?? '');
    setHeroUrl(guide.hero_image_url ?? '');
    setHeroAlt(guide.hero_image_alt ?? '');
    setLeadHeadline(guide.lead_headline ?? '');
    setLeadParagraphsText((guide.lead_paragraphs ?? []).join('\n\n'));
    setLocationListId(guide.location_list_id ?? '');
    setMapUrl(guide.map_image_url ?? '');
    setMapAlt(guide.map_image_alt ?? '');
    setCardPreview(guide.card_preview ?? '');
    setCardImageUrl(guide.card_image_url ?? '');
    setCardImageAlt(guide.card_image_alt ?? '');
    setFeaturedPeopleText((guide.featured_people ?? []).join('\n'));
    setIsPublished(guide.is_published);
    setIsFeatured(guide.is_featured);
    setPublishedAt(guide.published_at ? guide.published_at.slice(0, 16) : '');

    const c =
      detail?.contributors.map((r) => ({
        position: r.position,
        name: r.name,
        bio: r.bio ?? '',
        photo_url: r.photo_url ?? '',
        photo_alt: r.photo_alt ?? '',
        instagram_href: r.instagram_href ?? '',
      })) ?? [];
    setContributors(c);

    const rawBlocks = guide.blocks;
    if (Array.isArray(rawBlocks)) {
      setBlocks(parseEditorialBlocks(rawBlocks));
    } else {
      setBlocks([]);
    }
  }, [guide, detail?.contributors]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!guide) throw new Error('No guide');
      const lead_paragraphs = leadParagraphsText
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean);
      const featured_people = featuredPeopleText
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean);

      const contributorPayload = contributors.map((c, i) => ({
        position: i,
        name: c.name.trim(),
        bio: c.bio.trim() || null,
        photo_url: c.photo_url.trim() || null,
        photo_alt: c.photo_alt.trim() || null,
        instagram_href: c.instagram_href.trim() || null,
      }));

      const body: Record<string, unknown> = {
        slug: slug.trim(),
        title_prefix: titlePrefix.trim() || null,
        city_name: cityName.trim() || null,
        title_primary: titlePrimary.trim() || null,
        title_secondary: titleSecondary.trim() || null,
        hero_image_url: heroUrl.trim(),
        hero_image_alt: heroAlt.trim(),
        lead_headline: leadHeadline.trim() || null,
        lead_paragraphs,
        card_preview: cardPreview.trim() || null,
        card_image_url: cardImageUrl.trim() || null,
        card_image_alt: cardImageAlt.trim() || null,
        featured_people,
        is_published: isPublished,
        is_featured: isFeatured,
        contributors: contributorPayload,
      };

      if (publishedAt) {
        body.published_at = new Date(publishedAt).toISOString();
      } else {
        body.published_at = null;
      }

      if (guide.kind === 'city_guide') {
        body.location_list_id = locationListId || null;
        body.map_image_url = mapUrl.trim() || null;
        body.map_image_alt = mapAlt.trim() || null;
        body.blocks = null;
      } else {
        body.blocks = blocks;
        body.location_list_id = null;
        body.map_image_url = null;
        body.map_image_alt = null;
      }

      const response = await fetch(`/api/admin/guides/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': adminEmail,
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Save failed');
      }
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: GUIDES_ADMIN_KEY });
      void queryClient.invalidateQueries({ queryKey: ['admin-guide', id] });
      toast.success('Saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/admin/guides/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-email': adminEmail },
      });
      if (!response.ok) throw new Error('Delete failed');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Deleted');
      window.location.href = '/admin/guides';
    },
    onError: () => toast.error('Delete failed'),
  });

  const publicPath = useMemo(() => {
    if (!guide) return '';
    return guide.kind === 'editorial'
      ? `/city-guides/editorial/${slug.trim()}`
      : `/city-guides/${slug.trim()}`;
  }, [guide, slug]);

  const openPreview = useCallback(async () => {
    if (!adminEmail) {
      toast.error('Not signed in');
      return;
    }
    try {
      const response = await fetch(`/api/admin/guides/${id}/preview-link`, {
        headers: { 'x-user-email': adminEmail },
      });
      const responseData = await response.json();
      const data = responseData.data || responseData;
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Could not open preview');
      }
      const url = data.url as string;
      if (!url) {
        throw new Error('No preview URL returned');
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not open preview';
      toast.error(message);
    }
  }, [adminEmail, id]);

  const uploadMapImage = async (file: File) => {
    setMapImageUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });
      if (!uploadResponse.ok) {
        const errorResult = await uploadResponse.json().catch(() => ({}));
        throw new Error(
          (errorResult as { error?: string }).error ||
            (errorResult as { message?: string }).message ||
            'Map image upload failed'
        );
      }
      const uploadResponseData = await uploadResponse.json();
      const uploadResult = uploadResponseData.data || uploadResponseData;
      const url =
        (uploadResult as { url?: string }).url ||
        (uploadResult as { imageUrl?: string }).imageUrl;
      if (!url) {
        throw new Error('Upload succeeded but no URL was returned');
      }
      setMapUrl(url);
      toast.success('Map image uploaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Map image upload failed');
    } finally {
      setMapImageUploading(false);
    }
  };

  const uploadHeroImage = async (file: File) => {
    setHeroImageUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });
      if (!uploadResponse.ok) {
        const errorResult = await uploadResponse.json().catch(() => ({}));
        throw new Error(
          (errorResult as { error?: string }).error ||
            (errorResult as { message?: string }).message ||
            'Hero image upload failed'
        );
      }
      const uploadResponseData = await uploadResponse.json();
      const uploadResult = uploadResponseData.data || uploadResponseData;
      const url =
        (uploadResult as { url?: string }).url ||
        (uploadResult as { imageUrl?: string }).imageUrl;
      if (!url) {
        throw new Error('Upload succeeded but no URL was returned');
      }
      setHeroUrl(url);
      toast.success('Hero image uploaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Hero image upload failed');
    } finally {
      setHeroImageUploading(false);
    }
  };

  const uploadCardImage = async (file: File) => {
    setCardImageUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });
      if (!uploadResponse.ok) {
        const errorResult = await uploadResponse.json().catch(() => ({}));
        throw new Error(
          (errorResult as { error?: string }).error ||
            (errorResult as { message?: string }).message ||
            'Card image upload failed'
        );
      }
      const uploadResponseData = await uploadResponse.json();
      const uploadResult = uploadResponseData.data || uploadResponseData;
      const url =
        (uploadResult as { url?: string }).url ||
        (uploadResult as { imageUrl?: string }).imageUrl;
      if (!url) {
        throw new Error('Upload succeeded but no URL was returned');
      }
      setCardImageUrl(url);
      toast.success('Card image uploaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Card image upload failed');
    } finally {
      setCardImageUploading(false);
    }
  };

  const uploadContributorPhoto = async (index: number, file: File) => {
    setContributorPhotoUploadingIndex(index);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });
      if (!uploadResponse.ok) {
        const errorResult = await uploadResponse.json().catch(() => ({}));
        throw new Error(
          (errorResult as { error?: string }).error ||
            (errorResult as { message?: string }).message ||
            'Contributor photo upload failed'
        );
      }
      const uploadResponseData = await uploadResponse.json();
      const uploadResult = uploadResponseData.data || uploadResponseData;
      const url =
        (uploadResult as { url?: string }).url ||
        (uploadResult as { imageUrl?: string }).imageUrl;
      if (!url) {
        throw new Error('Upload succeeded but no URL was returned');
      }
      setContributors((prev) =>
        prev.map((x, j) => (j === index ? { ...x, photo_url: url } : x))
      );
      toast.success('Contributor photo uploaded');
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Contributor photo upload failed'
      );
    } finally {
      setContributorPhotoUploadingIndex(null);
    }
  };

  const uploadBlockImage = async (blockIndex: number, file: File) => {
    setBlockImageUploadingIndex(blockIndex);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });
      if (!uploadResponse.ok) {
        const errorResult = await uploadResponse.json().catch(() => ({}));
        throw new Error(
          (errorResult as { error?: string }).error ||
            (errorResult as { message?: string }).message ||
            'Block image upload failed'
        );
      }
      const uploadResponseData = await uploadResponse.json();
      const uploadResult = uploadResponseData.data || uploadResponseData;
      const url =
        (uploadResult as { url?: string }).url ||
        (uploadResult as { imageUrl?: string }).imageUrl;
      if (!url) {
        throw new Error('Upload succeeded but no URL was returned');
      }
      setBlocks((prev) =>
        prev.map((b, j) =>
          j === blockIndex && b.type === 'image' ? { ...b, src: url } : b
        )
      );
      toast.success('Block image uploaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Block image upload failed');
    } finally {
      setBlockImageUploadingIndex(null);
    }
  };

  const moveBlock = (index: number, dir: -1 | 1) => {
    setBlocks((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  if (adminLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <Loader2 className="size-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <h1 className="mb-4 text-xl font-semibold">Edit guide</h1>
        <Button type="button" onClick={() => login()}>
          Log in
        </Button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <p>Unauthorized</p>
      </div>
    );
  }

  if (isLoading || !guide) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <Loader2 className="size-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 p-6 pb-24 font-grotesk">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/guides"
            className="text-sm text-blue-600 hover:underline"
          >
            ← All guides
          </Link>
          <h1 className="mt-2 text-2xl font-semibold capitalize text-[#171717]">
            {guide.kind.replace('_', ' ')}
          </h1>
          {isPublished ? (
            <a
              href={publicPath}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              View live →
            </a>
          ) : (
            <p className="text-sm text-neutral-500">
              Publish to make this URL public.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void openPreview()}
            className="gap-1"
          >
            <Eye className="size-4" aria-hidden />
            Preview
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm('Delete this guide?')) deleteMutation.mutate();
            }}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="mr-1 size-4" />
            Delete
          </Button>
          <Button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-black text-white hover:bg-black/85"
          >
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <section className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Basics</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <div>
            <Label>Published at</Label>
            <Input
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
            />
            Published
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
            />
            Featured (hero on hub)
          </label>
        </div>
        {guide.kind === 'city_guide' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Title prefix</Label>
              <Input
                value={titlePrefix}
                onChange={(e) => setTitlePrefix(e.target.value)}
                placeholder="The IRL Guide to"
              />
            </div>
            <div>
              <Label>City name</Label>
              <Input
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
                placeholder="Berlin"
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Title primary (bold)</Label>
              <Input
                value={titlePrimary}
                onChange={(e) => setTitlePrimary(e.target.value)}
              />
            </div>
            <div>
              <Label>Title secondary (optional)</Label>
              <Input
                value={titleSecondary}
                onChange={(e) => setTitleSecondary(e.target.value)}
              />
            </div>
          </div>
        )}
        <div className="space-y-3">
          <div>
            <Label>Hero image</Label>
            <p className="mb-2 text-xs text-neutral-500">
              Upload to Supabase storage, or paste a URL below to override.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={heroImageUploading}
                onClick={() => heroFileInputRef.current?.click()}
              >
                {heroImageUploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {heroImageUploading ? 'Uploading…' : 'Upload image'}
              </Button>
              <input
                ref={heroFileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={heroImageUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadHeroImage(file);
                  e.target.value = '';
                }}
              />
            </div>
            {heroUrl.trim() ? (
              <div className="relative mt-3 h-52 w-full max-w-md overflow-hidden rounded-md border border-neutral-200 bg-neutral-50">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin preview */}
                <img
                  src={heroUrl}
                  alt={heroAlt.trim() || 'Hero preview'}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="guide-hero-url">Hero image URL (optional)</Label>
              <Input
                id="guide-hero-url"
                value={heroUrl}
                onChange={(e) => setHeroUrl(e.target.value)}
                placeholder="https://…"
                className="font-mono text-sm"
              />
            </div>
            <div>
              <Label htmlFor="guide-hero-alt">Hero image alt</Label>
              <Input
                id="guide-hero-alt"
                value={heroAlt}
                onChange={(e) => setHeroAlt(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Hub card</h2>
        <div>
          <Label>Card preview (list subtitle)</Label>
          <Textarea
            value={cardPreview}
            onChange={(e) => setCardPreview(e.target.value)}
            rows={3}
          />
        </div>
        <div className="space-y-3">
          <div>
            <Label>Card image</Label>
            <p className="mb-2 text-xs text-neutral-500">
              Upload to Supabase storage (hub list / featured tile), or paste a
              URL below.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={cardImageUploading}
                onClick={() => cardFileInputRef.current?.click()}
              >
                {cardImageUploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {cardImageUploading ? 'Uploading…' : 'Upload image'}
              </Button>
              <input
                ref={cardFileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={cardImageUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadCardImage(file);
                  e.target.value = '';
                }}
              />
            </div>
            {cardImageUrl.trim() ? (
              <div className="mt-3 rounded-md border border-neutral-200 bg-neutral-50">
                <CityGuidesHubCardImage
                  src={cardImageUrl}
                  alt={cardImageAlt.trim() || 'Card preview'}
                />
              </div>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="guide-card-image-url">
                Card image URL (optional)
              </Label>
              <Input
                id="guide-card-image-url"
                value={cardImageUrl}
                onChange={(e) => setCardImageUrl(e.target.value)}
                placeholder="https://…"
                className="font-mono text-sm"
              />
            </div>
            <div>
              <Label htmlFor="guide-card-image-alt">Card image alt</Label>
              <Input
                id="guide-card-image-alt"
                value={cardImageAlt}
                onChange={(e) => setCardImageAlt(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div>
          <Label>Featured people (one per line, hero chips)</Label>
          <Textarea
            value={featuredPeopleText}
            onChange={(e) => setFeaturedPeopleText(e.target.value)}
            rows={4}
            placeholder="Name One&#10;Name Two"
          />
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Lead</h2>
        <div>
          <Label>Headline (Title4)</Label>
          <Input
            value={leadHeadline}
            onChange={(e) => setLeadHeadline(e.target.value)}
          />
        </div>
        <div>
          <Label>Paragraphs (blank line between)</Label>
          <Textarea
            value={leadParagraphsText}
            onChange={(e) => setLeadParagraphsText(e.target.value)}
            rows={8}
          />
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Contributors</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setContributors((prev) => [
                ...prev,
                {
                  position: prev.length,
                  name: '',
                  bio: '',
                  photo_url: '',
                  photo_alt: '',
                  instagram_href: '',
                },
              ])
            }
          >
            Add contributor
          </Button>
        </div>
        {contributors.map((c, i) => (
          <div
            key={i}
            className="space-y-2 rounded border border-neutral-100 p-3"
          >
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setContributors((prev) => prev.filter((_, j) => j !== i))
                }
              >
                Remove
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                placeholder="Name"
                value={c.name}
                onChange={(e) => {
                  const v = e.target.value;
                  setContributors((prev) =>
                    prev.map((x, j) => (j === i ? { ...x, name: v } : x))
                  );
                }}
              />
              <Input
                placeholder="Instagram URL"
                value={c.instagram_href}
                onChange={(e) => {
                  const v = e.target.value;
                  setContributors((prev) =>
                    prev.map((x, j) =>
                      j === i ? { ...x, instagram_href: v } : x
                    )
                  );
                }}
              />
            </div>
            <Textarea
              placeholder="Bio"
              value={c.bio}
              onChange={(e) => {
                const v = e.target.value;
                setContributors((prev) =>
                  prev.map((x, j) => (j === i ? { ...x, bio: v } : x))
                );
              }}
              rows={2}
            />
            <div className="space-y-2">
              <Label className="text-neutral-700">Contributor photo</Label>
              <p className="text-xs text-neutral-500">
                Upload to Supabase storage, or paste a URL below to override.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={contributorPhotoUploadingIndex === i}
                  onClick={() =>
                    document
                      .getElementById(`contributor-photo-file-${i}`)
                      ?.click()
                  }
                >
                  {contributorPhotoUploadingIndex === i ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  {contributorPhotoUploadingIndex === i
                    ? 'Uploading…'
                    : 'Upload photo'}
                </Button>
                <input
                  id={`contributor-photo-file-${i}`}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={contributorPhotoUploadingIndex === i}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadContributorPhoto(i, file);
                    e.target.value = '';
                  }}
                />
              </div>
              {c.photo_url.trim() ? (
                <div className="relative mt-2 h-40 w-40 overflow-hidden rounded-md border border-neutral-200 bg-neutral-50">
                  {/* eslint-disable-next-line @next/next/no-img-element -- admin preview */}
                  <img
                    src={c.photo_url}
                    alt={c.photo_alt.trim() || 'Contributor preview'}
                    className="h-full w-full object-cover object-center"
                  />
                </div>
              ) : null}
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label
                    htmlFor={`contributor-photo-url-${i}`}
                    className="text-xs text-neutral-600"
                  >
                    Photo URL (optional)
                  </Label>
                  <Input
                    id={`contributor-photo-url-${i}`}
                    placeholder="https://…"
                    value={c.photo_url}
                    onChange={(e) => {
                      const v = e.target.value;
                      setContributors((prev) =>
                        prev.map((x, j) =>
                          j === i ? { ...x, photo_url: v } : x
                        )
                      );
                    }}
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <Label
                    htmlFor={`contributor-photo-alt-${i}`}
                    className="text-xs text-neutral-600"
                  >
                    Photo alt
                  </Label>
                  <Input
                    id={`contributor-photo-alt-${i}`}
                    placeholder="Portrait of …"
                    value={c.photo_alt}
                    onChange={(e) => {
                      const v = e.target.value;
                      setContributors((prev) =>
                        prev.map((x, j) =>
                          j === i ? { ...x, photo_alt: v } : x
                        )
                      );
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {guide.kind === 'city_guide' ? (
        <section className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-lg font-semibold">City guide map & venues</h2>
          <div>
            <Label>Location list</Label>
            <Select
              value={locationListId || '__none__'}
              onValueChange={(v) =>
                setLocationListId(v === '__none__' ? '' : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose list" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {lists.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.title} ({l.slug})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <div>
              <Label>Map image</Label>
              <p className="mb-2 text-xs text-neutral-500">
                Upload to Supabase storage (same pipeline as perks). You can
                still paste a URL below to override.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={mapImageUploading}
                  onClick={() => mapFileInputRef.current?.click()}
                >
                  {mapImageUploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  {mapImageUploading ? 'Uploading…' : 'Upload image'}
                </Button>
                <input
                  ref={mapFileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={mapImageUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadMapImage(file);
                    e.target.value = '';
                  }}
                />
              </div>
              {mapUrl.trim() ? (
                <div className="relative mt-3 h-44 w-full max-w-md overflow-hidden rounded-md border border-neutral-200 bg-neutral-50">
                  {/* eslint-disable-next-line @next/next/no-img-element -- admin preview; any host after upload */}
                  <img
                    src={mapUrl}
                    alt={mapAlt.trim() || 'Map preview'}
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="guide-map-url">Map image URL (optional)</Label>
                <Input
                  id="guide-map-url"
                  value={mapUrl}
                  onChange={(e) => setMapUrl(e.target.value)}
                  placeholder="https://…"
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <Label htmlFor="guide-map-alt">Map image alt</Label>
                <Input
                  id="guide-map-alt"
                  value={mapAlt}
                  onChange={(e) => setMapAlt(e.target.value)}
                />
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Editorial blocks</h2>
            <Select
              onValueChange={(t) =>
                setBlocks((prev) => [
                  ...prev,
                  emptyBlock(t as EditorialContentBlock['type']),
                ])
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Add block" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paragraph">Paragraph</SelectItem>
                <SelectItem value="subtitleTitle3">Title3</SelectItem>
                <SelectItem value="subtitleH1">H1</SelectItem>
                <SelectItem value="image">Image</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {blocks.map((block, i) => (
            <div
              key={i}
              className="space-y-2 rounded border border-neutral-100 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase text-neutral-500">
                  {block.type}
                </span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => moveBlock(i, -1)}
                    disabled={i === 0}
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => moveBlock(i, 1)}
                    disabled={i === blocks.length - 1}
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setBlocks((prev) => prev.filter((_, j) => j !== i))
                    }
                  >
                    Remove
                  </Button>
                </div>
              </div>
              {block.type === 'paragraph' ||
              block.type === 'subtitleTitle3' ||
              block.type === 'subtitleH1' ? (
                <Textarea
                  value={block.text}
                  onChange={(e) => {
                    const v = e.target.value;
                    setBlocks((prev) =>
                      prev.map((b, j) =>
                        j === i && 'text' in b ? { ...b, text: v } : b
                      )
                    );
                  }}
                  rows={block.type === 'paragraph' ? 4 : 2}
                />
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label className="text-neutral-700">Image</Label>
                    <p className="mb-2 text-xs text-neutral-500">
                      Upload to Supabase storage, or paste a URL below to
                      override.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        disabled={blockImageUploadingIndex === i}
                        onClick={() =>
                          document
                            .getElementById(`editorial-block-image-${i}`)
                            ?.click()
                        }
                      >
                        {blockImageUploadingIndex === i ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Upload className="size-4" />
                        )}
                        {blockImageUploadingIndex === i
                          ? 'Uploading…'
                          : 'Upload image'}
                      </Button>
                      <input
                        id={`editorial-block-image-${i}`}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={blockImageUploadingIndex === i}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void uploadBlockImage(i, file);
                          e.target.value = '';
                        }}
                      />
                    </div>
                    {block.src.trim() ? (
                      <div className="relative mt-3 h-52 w-full max-w-md overflow-hidden rounded-md border border-neutral-200 bg-neutral-50">
                        {/* eslint-disable-next-line @next/next/no-img-element -- admin preview */}
                        <img
                          src={block.src}
                          alt={block.alt.trim() || 'Block image preview'}
                          className="h-full w-full object-contain"
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="grid gap-2">
                    <div>
                      <Label
                        htmlFor={`editorial-block-image-url-${i}`}
                        className="text-xs text-neutral-600"
                      >
                        Image URL (optional)
                      </Label>
                      <Input
                        id={`editorial-block-image-url-${i}`}
                        placeholder="https://…"
                        value={block.src}
                        onChange={(e) => {
                          const v = e.target.value;
                          setBlocks((prev) =>
                            prev.map((b, j) =>
                              j === i && b.type === 'image'
                                ? { ...b, src: v }
                                : b
                            )
                          );
                        }}
                        className="font-mono text-sm"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor={`editorial-block-image-alt-${i}`}
                        className="text-xs text-neutral-600"
                      >
                        Alt
                      </Label>
                      <Input
                        id={`editorial-block-image-alt-${i}`}
                        placeholder="Describe the image"
                        value={block.alt}
                        onChange={(e) => {
                          const v = e.target.value;
                          setBlocks((prev) =>
                            prev.map((b, j) =>
                              j === i && b.type === 'image'
                                ? { ...b, alt: v }
                                : b
                            )
                          );
                        }}
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor={`editorial-block-image-caption-${i}`}
                        className="text-xs text-neutral-600"
                      >
                        Caption
                      </Label>
                      <Input
                        id={`editorial-block-image-caption-${i}`}
                        placeholder="Caption (optional)"
                        value={block.caption}
                        onChange={(e) => {
                          const v = e.target.value;
                          setBlocks((prev) =>
                            prev.map((b, j) =>
                              j === i && b.type === 'image'
                                ? { ...b, caption: v }
                                : b
                            )
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
