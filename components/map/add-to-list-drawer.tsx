'use client';

import { FormEvent, useEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { Bookmark, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MAX_PLAYER_LIST_DESCRIPTION_LENGTH } from '@/lib/constants';
import {
  usePlayerCustomLists,
  useCreateCustomList,
  useAddLocationToLists,
} from '@/hooks/usePlayerCustomLists';
import { CollectionVisibilityToggle } from '@/components/map/collection-visibility-toggle';
import { Textarea } from '@/components/ui/textarea';
import type { VisitStatus } from '@/lib/types';

const MAX_COMMENT_LENGTH = 500;

const VISIT_STATUS_OPTIONS = [
  { value: 'want_to_try', label: 'Want to try', Icon: Bookmark },
  { value: 'been', label: 'Been', Icon: Check },
] as const;

interface AddToListLocation {
  placeId: string;
  name: string;
  address?: string | null;
  latitude?: number;
  longitude?: number;
}

interface AddToListDrawerProps {
  location: AddToListLocation;
  walletAddress: string;
  /** Stored status for this player and place. Null when they have not chosen one. */
  visitStatus: VisitStatus | null;
  /** Persists the toggle. Rejects when the save fails so the toggle can revert. */
  onSelectVisitStatus: (visitStatus: VisitStatus) => Promise<void>;
  /** Back button / after a successful add. Leaves the map with no sheet open. */
  onClose: () => void;
  /** Close control beside the location name. Reopens the check-in sheet. */
  onReturnToCheckIn: () => void;
  /**
   * After creating a list (and saving the current spot into it), hand off so
   * the parent can open the lists drawer focused on that list.
   */
  onListCreated?: (listId: string, details: { isFirstList: boolean }) => void;
  /** Fired after the spot is saved, including when points were awarded. */
  onSaved?: (result: { pointsEarned: number }) => void;
  /** Coaching bubble anchored above the CREATE NEW LIST control. */
  createListTip?: ReactNode;
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

function CloseIcon() {
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
        d="M19.9987 7.32025L16.7199 4L12.0122 8.69045L7.32171 4L4.00146 7.32025L8.69538 11.9969L4.00146 16.6735L7.32171 19.9938L12.0122 15.3033L16.7199 19.9938L19.9987 16.6735L15.3186 11.9969L19.9987 7.32025Z"
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
 * Replaces the check-in sheet. Full height on mobile; a capped card from sm up.
 */
export default function AddToListDrawer({
  location,
  walletAddress,
  visitStatus: savedVisitStatus,
  onSelectVisitStatus,
  onClose,
  onReturnToCheckIn,
  onListCreated,
  onSaved,
  createListTip,
}: AddToListDrawerProps) {
  const [view, setView] = useState<'lists' | 'create'>('lists');
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(
    new Set()
  );
  const [visitStatus, setVisitStatus] = useState<VisitStatus | null>(
    savedVisitStatus
  );
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [comment, setComment] = useState('');
  /** The player's stored comment; each player has at most one per place. */
  const [savedComment, setSavedComment] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);
  const userEditedCommentRef = useRef(false);
  /** A tap in this drawer wins over a status response that is still in flight. */
  const userPickedStatusRef = useRef(false);

  useEffect(() => {
    if (savedVisitStatus === 'been' || savedVisitStatus === 'want_to_try') {
      setVisitStatus(savedVisitStatus);
    }
  }, [savedVisitStatus]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      placeId: location.placeId,
      walletAddress,
    });

    void (async () => {
      try {
        const response = await fetch(
          `/api/location-comments?${params.toString()}`,
          { signal: controller.signal }
        );
        if (!response.ok) return;
        const body = await response.json();
        const data = body.data ?? body;
        const status = data.visitStatus;
        if (
          !userPickedStatusRef.current &&
          (status === 'been' || status === 'want_to_try')
        ) {
          setVisitStatus(status);
        }
        const existingComment =
          typeof data.userComment === 'string' ? data.userComment : '';
        setSavedComment(existingComment);
        if (!userEditedCommentRef.current) {
          setComment(existingComment);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
      }
    })();

    return () => controller.abort();
  }, [location.placeId, walletAddress]);

  const handleSelectVisitStatus = async (nextStatus: VisitStatus) => {
    if (isSavingStatus || nextStatus === visitStatus) return;
    userPickedStatusRef.current = true;
    const previous = visitStatus;
    setVisitStatus(nextStatus);
    setIsSavingStatus(true);
    try {
      await onSelectVisitStatus(nextStatus);
    } catch {
      setVisitStatus(previous);
    } finally {
      setIsSavingStatus(false);
    }
  };

  // Create-list form state
  const [newListTitle, setNewListTitle] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [newListIsPrivate, setNewListIsPrivate] = useState(false);
  const [newListThumbnailUrl, setNewListThumbnailUrl] = useState<string | null>(
    null
  );
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: lists = [], isLoading: isLoadingLists } = usePlayerCustomLists(
    walletAddress,
    location.placeId
  );
  /** Lock first-list detection before create invalidates the lists query. */
  const hadNoListsRef = useRef<boolean | null>(null);
  if (hadNoListsRef.current === null && !isLoadingLists) {
    hadNoListsRef.current = lists.length === 0;
  }
  const { mutateAsync: createList, isPending: isCreatingList } =
    useCreateCustomList(walletAddress);
  const { mutateAsync: addToLists, isPending: isAddingToLists } =
    useAddLocationToLists(walletAddress);

  const selectedCount = selectedListIds.size;
  const canComment = visitStatus === 'been';
  const trimmedComment = comment.trim();
  const commentChanged = canComment && trimmedComment !== savedComment.trim();
  const savePayload = {
    walletAddress,
    placeId: location.placeId,
    ...(commentChanged
      ? { visitStatus: 'been' as const, comment: trimmedComment }
      : {}),
    location:
      location.latitude != null && location.longitude != null
        ? {
            name: location.name,
            address: location.address ?? undefined,
            latitude: location.latitude,
            longitude: location.longitude,
          }
        : undefined,
  };
  const canCreateList =
    newListTitle.trim().length > 0 &&
    !isCreatingList &&
    !isUploadingThumbnail &&
    !isAddingToLists;

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
    if (isAddingToLists || isSavingComment) return;
    const hasLists = selectedCount > 0;
    if (!hasLists && !commentChanged) {
      onReturnToCheckIn();
      return;
    }

    if (hasLists) {
      void addToLists(
        {
          ...savePayload,
          listIds: [...selectedListIds],
        },
        {
          onSuccess: (result) => {
            onSaved?.({ pointsEarned: result.pointsEarned ?? 0 });
            onReturnToCheckIn();
          },
        }
      );
      return;
    }

    setIsSavingComment(true);
    void fetch('/api/location-visit-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress,
        placeId: location.placeId,
        visitStatus: 'been',
        comment: trimmedComment,
        ...(savePayload.location ? { location: savePayload.location } : {}),
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const result = await response.json().catch(() => null);
          throw new Error(result?.error || 'Failed to save comment');
        }
        onReturnToCheckIn();
      })
      .catch((error: unknown) => {
        toast.error(
          error instanceof Error ? error.message : 'Failed to save comment'
        );
      })
      .finally(() => {
        setIsSavingComment(false);
      });
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
    if (isCreatingList || isUploadingThumbnail || isAddingToLists) return;

    try {
      const isFirstList = hadNoListsRef.current ?? lists.length === 0;
      const result = await createList({
        walletAddress,
        title,
        description: newListDescription.trim() || null,
        thumbnailUrl: newListThumbnailUrl,
        isPrivate: newListIsPrivate,
      });
      const createdId = result?.list?.id as string | undefined;
      setNewListTitle('');
      setNewListDescription('');
      setNewListThumbnailUrl(null);
      setNewListIsPrivate(false);

      if (createdId && onListCreated) {
        try {
          const added = await addToLists({
            ...savePayload,
            listIds: [createdId],
          });
          onSaved?.({ pointsEarned: added.pointsEarned ?? 0 });
        } catch (error) {
          // List exists; add-location hook already toasts. Still hand off focus.
          console.error('Failed to add location to new list', error);
        }
        onListCreated(createdId, { isFirstList });
        onClose();
        return;
      }

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

  const headerLabel = view === 'create' ? 'NEW COLLECTION' : location.name;

  return (
    <div
      data-testid="add-to-list-drawer"
      className={cn(
        'flex h-dvh max-h-dvh w-full flex-col border border-[rgba(255,255,255,0.15)] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_4px_16px_0_rgba(0,0,0,0.25)] sm:h-auto sm:max-h-[70vh] sm:pb-0',
        createListTip ? 'overflow-visible' : 'overflow-hidden'
      )}
    >
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
          aria-label={view === 'create' ? 'Back to lists' : 'Back to map'}
        >
          <BackArrowIcon />
        </button>

        <h2
          className={cn(
            'min-w-0 flex-1 truncate px-2 text-center text-[#171717]',
            view === 'create'
              ? 'label-medium uppercase tracking-wide'
              : 'title5'
          )}
        >
          {headerLabel}
        </h2>

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
          <button
            type="button"
            onClick={onReturnToCheckIn}
            className="flex size-10 shrink-0 items-center justify-center rounded-[179px] border border-[var(--Backgrounds-Secondary-CTA-BG,#DBDBDB)] bg-[var(--Backgrounds-Background,#FFF)] p-[var(--sds-size-space-200)] shadow-[0_1px_8px_0_rgba(0,0,0,0.08)] transition-opacity hover:opacity-80"
            aria-label="Back to check-in"
          >
            <CloseIcon />
          </button>
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

            <label className="block">
              <span className="label-small uppercase tracking-wide text-[#757575]">
                Description
              </span>
              <textarea
                value={newListDescription}
                maxLength={MAX_PLAYER_LIST_DESCRIPTION_LENGTH}
                onChange={(e) => setNewListDescription(e.target.value)}
                placeholder="What is this collection about?"
                rows={3}
                className="mt-1 w-full resize-none rounded-none border border-neutral-300 bg-white px-3 py-2 text-sm text-[#171717] focus:border-[var(--Borders-Heavy-Border,#454545)] focus:shadow-[0_0_0_2px_#FFE600] focus:outline-none"
              />
            </label>

            <CollectionVisibilityToggle
              isPrivate={newListIsPrivate}
              disabled={isCreatingList}
              onIsPrivateChange={setNewListIsPrivate}
            />
          </div>
        </form>
      ) : (
        <>
          <div className="flex shrink-0 flex-col gap-3 px-4 pb-4">
            <div
              role="radiogroup"
              aria-label="Have you been here?"
              className="grid w-full grid-cols-2 border border-[#171717]"
            >
              {VISIT_STATUS_OPTIONS.map(({ value, label, Icon }) => {
                const isOn = visitStatus === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={isOn}
                    disabled={isSavingStatus}
                    onClick={() => void handleSelectVisitStatus(value)}
                    className={cn(
                      'flex h-11 items-center justify-center gap-2 label-small uppercase tracking-wide transition-colors disabled:cursor-wait',
                      isOn
                        ? 'bg-[#171717] text-white'
                        : 'bg-white text-[#171717] hover:bg-neutral-100'
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {label}
                  </button>
                );
              })}
            </div>

            <Textarea
              aria-label="Comment"
              value={comment}
              maxLength={MAX_COMMENT_LENGTH}
              onChange={(e) => {
                userEditedCommentRef.current = true;
                setComment(e.target.value);
              }}
              disabled={!canComment}
              placeholder={
                canComment
                  ? 'Share why this place is worth visiting...'
                  : 'Mark as Been to add a comment'
              }
              rows={3}
              className="min-h-[88px] resize-none rounded-none border border-neutral-300 bg-white px-3 py-2 text-base text-[#171717] placeholder:text-[#A9A9A9] focus-visible:border-[var(--Borders-Heavy-Border,#454545)] focus-visible:shadow-[0_0_0_2px_#FFE600] focus-visible:ring-0 focus-visible:ring-offset-0 md:text-sm"
            />
          </div>

          <div className="flex shrink-0 items-center justify-end gap-3 border-b border-[#DBDBDB] px-4 pb-2">
            {selectedCount > 0 ? (
              <span className="label-medium min-w-0 flex-1 uppercase tracking-wide text-[#171717]">
                {`Add to ${selectedCount} list${selectedCount === 1 ? '' : 's'}`}
              </span>
            ) : null}
            <div className="relative shrink-0">
              {createListTip}
              <button
                type="button"
                onClick={() => setView('create')}
                className="flex shrink-0 items-center gap-[var(--sds-size-space-200)] border-b border-[#171717] transition-opacity hover:opacity-80"
              >
                <span className="label-medium uppercase tracking-wide text-[#171717]">
                  CREATE NEW LIST
                </span>
                <CreateNewListIcon />
              </button>
            </div>
          </div>

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
                const alreadySaved = Boolean(list.contains_location);
                return (
                  <div
                    key={list.id}
                    className={cn(
                      'flex w-full items-center gap-[var(--sds-size-space-400)] px-[var(--sds-size-space-400)] pb-[var(--sds-size-space-300)] pt-[var(--sds-size-space-400)] transition-colors',
                      isSelected && !alreadySaved && 'bg-[#DBDBDB]'
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
                        {alreadySaved ? ' · SAVED' : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (alreadySaved) return;
                        toggleListSelection(list.id);
                      }}
                      disabled={alreadySaved}
                      aria-pressed={isSelected}
                      aria-label={
                        alreadySaved
                          ? `Already saved to ${list.title}`
                          : isSelected
                            ? `Remove ${list.title} from selection`
                            : `Add location to ${list.title}`
                      }
                      className={cn(
                        'flex size-10 shrink-0 items-center justify-center',
                        alreadySaved
                          ? 'cursor-not-allowed text-[#A9A9A9]'
                          : 'text-[#171717] transition-opacity hover:opacity-70'
                      )}
                    >
                      {isSelected && !alreadySaved ? (
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
              disabled={isAddingToLists || isSavingComment}
              className="flex h-11 w-full items-center justify-center bg-[#171717] text-white label-medium uppercase tracking-wide transition-colors hover:bg-black disabled:opacity-100"
            >
              {isAddingToLists || isSavingComment ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                'SAVE'
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
