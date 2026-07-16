'use client';

import { FormEvent, useRef, useState } from 'react';
import Image from 'next/image';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { formatLocationCategory } from '@/lib/utils/format-location-category';
import { cn } from '@/lib/utils';
import {
  usePlayerCustomLists,
  useCreateCustomList,
  useAddLocationToLists,
} from '@/hooks/usePlayerCustomLists';

interface AddToListLocation {
  placeId: string;
  name: string;
  type?: string | null;
  imageUrl?: string | null;
}

interface AddToListDrawerProps {
  location: AddToListLocation;
  walletAddress: string;
  /** Back button / after a successful add. */
  onClose: () => void;
}

/** Bookmark-style "add list" icon from the design (16×16). */
function CreateNewListIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      className={cn('size-4 shrink-0', className)}
      aria-hidden
    >
      <path
        d="M14 5.23487H2.00243V3.33398H14V5.23487ZM5.9477 7.05021H2V8.95109H5.9477V7.05021ZM5.85712 10.7664H2V12.6673H5.85712V10.7664Z"
        fill="#171717"
      />
      <path
        d="M14.0002 8.478H11.4365V6.14844H9.50581V8.478H6.94214V10.3365H9.50581V12.666H11.4365V10.3365H14.0002V8.478Z"
        fill="#171717"
      />
    </svg>
  );
}

function BackArrowIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      className="aspect-square size-6 shrink-0"
      aria-hidden
    >
      <path
        d="M21.9995 10.1429H8.0183L12.1756 6.28368L9.88918 4L1.99951 11.9846L9.88918 20L12.1756 17.7139L8.00185 13.8547H21.9995V10.1429Z"
        fill="#757575"
      />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('size-6 shrink-0', className)}
      aria-hidden
    >
      <path
        d="M21 13.3574H13.8574V20H10.1426V13.3574H3V9.65039H10.1426V3H13.8574V9.65039H21V13.3574Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * ADD TO LIST drawer: pick (or create) custom lists to save a map location to.
 * Opened from the SAVE TO LIST button on the map card.
 */
export default function AddToListDrawer({
  location,
  walletAddress,
  onClose,
}: AddToListDrawerProps) {
  const [view, setView] = useState<'lists' | 'create'>('lists');
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(
    new Set()
  );

  // Create-list form state
  const [newListTitle, setNewListTitle] = useState('');
  const [newListIsPrivate, setNewListIsPrivate] = useState(true);
  const [newListThumbnailUrl, setNewListThumbnailUrl] = useState<string | null>(
    null
  );
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: lists = [], isLoading: isLoadingLists } = usePlayerCustomLists(
    walletAddress,
    location.placeId
  );
  const { mutateAsync: createList, isPending: isCreatingList } =
    useCreateCustomList(walletAddress);
  const { mutate: addToLists, isPending: isAddingToLists } =
    useAddLocationToLists(walletAddress);

  const selectedCount = selectedListIds.size;
  const canCreateList =
    newListTitle.trim().length > 0 && !isCreatingList && !isUploadingThumbnail;

  const toggleListSelection = (listId: string) => {
    setSelectedListIds((current) => {
      const next = new Set(current);
      if (next.has(listId)) {
        next.delete(listId);
      } else {
        next.add(listId);
      }
      return next;
    });
  };

  const handleAdd = () => {
    if (selectedCount === 0 || isAddingToLists) return;
    addToLists(
      {
        walletAddress,
        placeId: location.placeId,
        listIds: [...selectedListIds],
      },
      { onSuccess: () => onClose() }
    );
  };

  const handleThumbnailChange = async (file: File | null) => {
    if (!file) return;
    setIsUploadingThumbnail(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Upload failed');
      const data = result.data ?? result;
      const uploadedUrl =
        (typeof data.thumbnailUrl === 'string' && data.thumbnailUrl) ||
        (typeof data.imageUrl === 'string' && data.imageUrl) ||
        (typeof data.url === 'string' && data.url) ||
        null;
      setNewListThumbnailUrl(uploadedUrl);
    } catch (error) {
      console.error('Failed to upload list thumbnail', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to upload thumbnail'
      );
    } finally {
      setIsUploadingThumbnail(false);
    }
  };

  const handleCreateList = async (event?: FormEvent) => {
    event?.preventDefault();
    const title = newListTitle.trim();
    if (!title) {
      toast.error('Enter a collection name');
      return;
    }
    if (isCreatingList || isUploadingThumbnail) return;

    try {
      const result = await createList({
        walletAddress,
        title,
        thumbnailUrl: newListThumbnailUrl,
        isPrivate: newListIsPrivate,
      });
      const createdId = result?.list?.id as string | undefined;
      setNewListTitle('');
      setNewListThumbnailUrl(null);
      setNewListIsPrivate(true);
      if (createdId) {
        setSelectedListIds((current) => new Set(current).add(createdId));
      }
      setView('lists');
      toast.success('List created');
    } catch (error) {
      // useCreateCustomList already toasts; keep a console trail for debugging.
      console.error('Failed to create custom list', error);
    }
  };

  const headerLabel = view === 'create' ? 'NEW COLLECTION' : 'ADD TO LIST';

  return (
    <div className="flex max-h-[70vh] w-full flex-col overflow-hidden border border-[rgba(255,255,255,0.15)] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_4px_16px_0_rgba(0,0,0,0.25)] sm:pb-0">
      {/* Row 1: back + centered title (+ create confirm checkmark) */}
      <div className="flex h-16 w-full shrink-0 items-center justify-between px-4">
        <button
          type="button"
          onClick={() => {
            if (view === 'create') {
              setView('lists');
            } else {
              onClose();
            }
          }}
          className="flex size-10 shrink-0 items-center justify-center rounded-[179px] border border-[var(--Backgrounds-Secondary-CTA-BG,#DBDBDB)] bg-[var(--Backgrounds-Background,#FFF)] p-[var(--sds-size-space-200)] shadow-[0_1px_8px_0_rgba(0,0,0,0.08)] transition-opacity hover:opacity-80"
          aria-label={view === 'create' ? 'Back to lists' : 'Back to map card'}
        >
          <BackArrowIcon />
        </button>

        <span className="label-medium uppercase tracking-wide text-[#171717]">
          {headerLabel}
        </span>

        {view === 'create' ? (
          <button
            type="button"
            onClick={() => void handleCreateList()}
            disabled={!canCreateList}
            className="flex size-10 shrink-0 items-center justify-center rounded-[179px] border border-[var(--Backgrounds-Secondary-CTA-BG,#DBDBDB)] bg-[var(--Backgrounds-Background,#FFF)] p-[var(--sds-size-space-200)] shadow-[0_1px_8px_0_rgba(0,0,0,0.08)] transition-opacity hover:opacity-80 disabled:opacity-40"
            aria-label="Save new list"
          >
            {isCreatingList ? (
              <Loader2 className="size-5 animate-spin text-[#171717]" />
            ) : (
              <Check className="size-5 text-[#171717]" />
            )}
          </button>
        ) : (
          /* Spacer keeps the title optically centered when there's no checkmark. */
          <div className="size-10 shrink-0" aria-hidden />
        )}
      </div>

      {view === 'create' ? (
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => void handleCreateList(event)}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
            {/* Thumbnail upload — native img avoids next/image optimizer blocking the create flow */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingThumbnail || isCreatingList}
              className="relative flex h-[192px] w-full max-w-[361px] shrink-0 flex-col items-center justify-center gap-2 overflow-hidden border border-dashed border-[var(--Borders-Heavy-Border,#454545)] bg-[var(--Backgrounds-Secondary-CTA-BG,#DBDBDB)] px-10 py-4 transition-opacity hover:opacity-80 disabled:opacity-50"
              aria-label="Upload list thumbnail"
            >
              {newListThumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- local upload preview; avoid optimizer failures mid-create
                <img
                  src={newListThumbnailUrl}
                  alt=""
                  className="absolute inset-0 size-full object-cover"
                />
              ) : isUploadingThumbnail ? (
                <Loader2 className="size-5 animate-spin text-[#757575]" />
              ) : (
                <span className="label-small uppercase text-[#757575]">
                  Thumbnail
                </span>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) =>
                void handleThumbnailChange(e.target.files?.[0] ?? null)
              }
            />

            {/* Collection name */}
            <label className="block">
              <span className="label-small uppercase tracking-wide text-[#757575]">
                Collection name
              </span>
              <input
                type="text"
                value={newListTitle}
                maxLength={80}
                onChange={(e) => setNewListTitle(e.target.value)}
                placeholder="My favorite spots"
                autoFocus
                className="mt-1 w-full rounded-none border border-neutral-300 bg-white px-3 py-2 text-sm text-[#171717] focus:border-[var(--Borders-Heavy-Border,#454545)] focus:shadow-[0_0_0_2px_#FFE600] focus:outline-none"
              />
            </label>

            {/* Private / public toggle */}
            <div className="flex items-center justify-between">
              <span className="label-small uppercase tracking-wide text-[#757575]">
                {newListIsPrivate ? 'Private' : 'Public'}
              </span>
              <Switch
                checked={!newListIsPrivate}
                onCheckedChange={(checked) => setNewListIsPrivate(!checked)}
                aria-label="Toggle list visibility between private and public"
              />
            </div>
          </div>
        </form>
      ) : (
        <>
          {/* Row 2: location being added */}
          <div className="flex shrink-0 items-center gap-2 px-4 pb-2">
            <div className="relative flex h-[42px] w-[41px] shrink-0 items-start justify-end gap-2 overflow-hidden bg-neutral-100 p-2">
              {location.imageUrl ? (
                <Image
                  src={location.imageUrl}
                  alt=""
                  fill
                  sizes="41px"
                  className="object-cover"
                />
              ) : null}
            </div>
            <div className="flex min-w-0 flex-col items-start gap-1">
              <span className="title5 w-full truncate text-[#171717]">
                {location.name}
              </span>
              <span className="label-small flex shrink-0 items-center justify-center gap-2 border border-[#171717] px-1 py-0.5 uppercase text-[#171717]">
                {formatLocationCategory(location.type)}
              </span>
            </div>
          </div>

          {/* CREATE NEW LIST link */}
          <button
            type="button"
            onClick={() => setView('create')}
            className="flex shrink-0 items-center gap-[var(--sds-size-space-200)] px-4 py-3 transition-opacity hover:opacity-80"
          >
            <span className="label-medium uppercase tracking-wide text-[#171717]">
              NEW COLLECTION
            </span>
            <CreateNewListIcon />
          </button>

          {/* User's lists */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoadingLists ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-[#757575]" />
              </div>
            ) : lists.length === 0 ? (
              <p className="body-small px-4 py-6 text-center text-[#757575]">
                No lists yet. Create your first list to save this location.
              </p>
            ) : (
              lists.map((list) => {
                const isSelected = selectedListIds.has(list.id);
                return (
                  <div
                    key={list.id}
                    className={cn(
                      'flex w-full items-center gap-[var(--sds-size-space-400)] px-[var(--sds-size-space-400)] pb-[var(--sds-size-space-300)] pt-[var(--sds-size-space-400)] transition-colors',
                      isSelected && 'bg-[#DBDBDB]'
                    )}
                  >
                    <div className="relative size-12 shrink-0 overflow-hidden bg-neutral-200">
                      {list.thumbnail_url ? (
                        <Image
                          src={list.thumbnail_url}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="title5 truncate text-[#171717]">
                        {list.title}
                      </span>
                      <span className="label-small uppercase tracking-wide text-[#757575]">
                        {`${list.location_count} LOCATION${list.location_count === 1 ? '' : 'S'}`}
                        {list.contains_location ? ' · SAVED' : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleListSelection(list.id)}
                      aria-pressed={isSelected}
                      aria-label={
                        isSelected
                          ? `Remove ${list.title} from selection`
                          : `Add location to ${list.title}`
                      }
                      className="flex size-10 shrink-0 items-center justify-center text-[#171717] transition-opacity hover:opacity-70"
                    >
                      {isSelected ? (
                        <Check className="size-6" aria-hidden />
                      ) : (
                        <PlusIcon />
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom CTA */}
          <div className="shrink-0 p-4">
            <button
              type="button"
              onClick={handleAdd}
              disabled={selectedCount === 0 || isAddingToLists}
              className={cn(
                'flex h-11 w-full items-center justify-center label-medium uppercase tracking-wide transition-colors',
                selectedCount === 0
                  ? 'cursor-not-allowed bg-[#DBDBDB] text-[#757575]'
                  : 'bg-[#171717] text-white hover:bg-black'
              )}
            >
              {isAddingToLists ? (
                <Loader2 className="size-5 animate-spin" />
              ) : selectedCount === 0 ? (
                'SELECT A LIST TO ADD'
              ) : (
                `ADD TO ${selectedCount} LIST${selectedCount === 1 ? '' : 'S'}`
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
