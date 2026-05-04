'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { UserProfile } from '@/lib/types';
import { invalidateProfileRelatedQueries } from '@/lib/invalidate-profile-queries';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type AboutYouDraft = Pick<
  UserProfile,
  | 'username'
  | 'website'
  | 'city'
  | 'country'
  | 'bio'
  | 'twitter_handle'
  | 'instagram_handle'
>;

/** Editable inputs — white field, light border */
const editFieldInputClassName =
  'flex h-10 w-full min-h-0 flex-[1_0_0] items-center gap-2 self-stretch border border-solid border-[var(--Borders-Light-Border,#DBDBDB)] bg-[var(--Backgrounds-Background,#FFF)] px-4 py-1 body-medium text-[#A9A9A9] placeholder:text-[#A9A9A9] shadow-none rounded-none outline-none focus-visible:border-[#313131] focus-visible:ring-2 focus-visible:ring-[#FFE600] focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50';

/** Bio — same shell as inputs; multiline */
const editFieldTextareaClassName =
  'flex min-h-[100px] w-full min-w-0 flex-[1_0_0] resize-y items-start gap-2 self-stretch border border-solid border-[var(--Borders-Light-Border,#DBDBDB)] bg-[var(--Backgrounds-Background,#FFF)] px-4 py-1 body-medium text-[#A9A9A9] placeholder:text-[#A9A9A9] shadow-none rounded-none outline-none focus-visible:border-[#313131] focus-visible:ring-2 focus-visible:ring-[#FFE600] focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50';

/** Read-only email only — support border + light steel fill */
const editFieldEmailClassName =
  'flex h-10 w-full min-h-0 flex-[1_0_0] items-center gap-2 self-stretch border border-solid border-[var(--Text-Support-Text,#A9A9A9)] bg-[var(--Borders-Light-Border,#DBDBDB)] px-4 py-1 body-medium text-[#A9A9A9] placeholder:text-[#A9A9A9] shadow-none rounded-none outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50';

interface EditSocialsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: UserProfile | null | undefined;
}

const emptyDraft: AboutYouDraft = {
  username: '',
  website: '',
  city: '',
  country: '',
  bio: '',
  twitter_handle: '',
  instagram_handle: '',
};

function draftFromProfile(p: UserProfile): AboutYouDraft {
  return {
    username: (p.username ?? '').toLowerCase(),
    website: p.website ?? '',
    city: p.city ?? '',
    country: p.country ?? '',
    bio: p.bio ?? '',
    twitter_handle: p.twitter_handle ?? '',
    instagram_handle: p.instagram_handle ?? '',
  };
}

function CloseModalIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      className="aspect-square size-6 shrink-0"
      aria-hidden
    >
      <path
        d="M4.0013 7.32025L7.28012 4L11.9878 8.69045L16.6783 4L19.9985 7.32025L15.3046 11.9969L19.9985 16.6735L16.6783 19.9938L11.9878 15.3033L7.28012 19.9938L4.0013 16.6735L8.68139 11.9969L4.0013 7.32025Z"
        fill="#171717"
      />
    </svg>
  );
}

function AvatarPencilIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M5.77507 17.1028L5.7812 15.3686V15.3656L5.7858 13.8912C5.7858 13.7175 5.82868 13.5837 5.96193 13.4607L13.4071 5.97368L17.3311 9.91707L13.0686 14.2079L9.85377 17.4364C9.75115 17.5225 9.64853 17.5763 9.4969 17.5763L6.21771 17.5963C6.19474 17.5963 6.17329 17.5932 6.15338 17.5901H5.78273V17.1781C5.77813 17.1535 5.77661 17.1274 5.77661 17.1028H5.77507ZM4.19751 21.0001H17.7339V19.0045H4.19751V21.0001ZM19.8399 5.15272L18.1582 3.46467C17.541 2.84511 16.5423 2.84511 15.9251 3.46467L14.2709 5.12505L18.1858 9.0546L19.8399 7.39422C20.4572 6.77466 20.4572 5.77229 19.8399 5.15272Z"
        fill="#757575"
      />
    </svg>
  );
}

export default function EditSocialsModal({
  open,
  onOpenChange,
  profile,
}: EditSocialsModalProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<AboutYouDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (open && profile) {
      setDraft(draftFromProfile(profile));
      setProfilePictureUrl(profile.profile_picture_url ?? '');
    }
  }, [open, profile]);

  const handleImageUpload = async (file: File) => {
    if (!profile?.wallet_address) return;

    setUploadingImage(true);
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
            'Failed to upload image. Please try again.'
        );
      }

      const uploadResponseData = await uploadResponse.json();
      const uploadResult = uploadResponseData.data || uploadResponseData;
      const imageUrl = uploadResult.imageUrl || uploadResult.url;

      if (!imageUrl || typeof imageUrl !== 'string') {
        throw new Error('Upload succeeded but no image URL was returned');
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          ...draft,
          profile_picture_url: imageUrl,
          wallet_address: profile.wallet_address,
        }),
      });

      const profilePutBody = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(
          typeof profilePutBody === 'object' &&
            profilePutBody !== null &&
            'error' in profilePutBody &&
            typeof (profilePutBody as { error?: string }).error === 'string'
            ? (profilePutBody as { error: string }).error
            : 'Failed to update profile'
        );
        return;
      }

      setProfilePictureUrl(imageUrl);
      toast.success('Profile picture updated');
      invalidateProfileRelatedQueries(queryClient, profile.wallet_address);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Error uploading profile picture'
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAvatarFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      void handleImageUpload(file);
    }
    event.target.value = '';
  };

  const handleSave = async () => {
    if (!profile?.wallet_address) return;

    setSaving(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          ...draft,
          profile_picture_url:
            profilePictureUrl || profile.profile_picture_url || '',
          wallet_address: profile.wallet_address,
        }),
      });

      const raw = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        data?: { pointsAwarded?: unknown[] };
        pointsAwarded?: unknown[];
      };

      if (!response.ok) {
        toast.error(raw.error ?? 'Could not save profile');
        return;
      }
      const result = raw.data ?? raw;
      let message = 'Profile updated';
      if (result?.pointsAwarded && result.pointsAwarded.length > 0) {
        message += ` — +${result.pointsAwarded.length * 5} points`;
      }
      toast.success(message);
      invalidateProfileRelatedQueries(queryClient, profile.wallet_address);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error('Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="max-h-[90vh] w-[min(100%,393px)] max-w-[393px] gap-0 overflow-y-auto overflow-x-hidden border border-gray-200 bg-white p-0 font-grotesk sm:rounded-3xl"
        overlayClassName="bg-black/60 backdrop-blur-sm"
      >
        <DialogDescription className="sr-only">
          Edit your profile: photo, username, website, location, bio, and social
          handles.
        </DialogDescription>

        {/* Header: 393×212; aspect-ratio 317/171 matches 393/212 */}
        <div className="relative flex h-[212px] w-full max-w-[393px] shrink-0 flex-col bg-gradient-to-b from-[#DBDBDB] to-[#757575] pb-4">
          {/* Row 1: title + close */}
          <div className="flex w-full shrink-0 flex-row items-stretch justify-between px-0 pt-3">
            <DialogTitle asChild>
              <span className="label-medium self-center px-4 text-[#171717]">
                Edit Profile
              </span>
            </DialogTitle>
            <DialogClose
              type="button"
              className="mr-4 flex size-[56px] shrink-0 items-center justify-center self-center rounded-full bg-white text-[#171717] transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600] focus-visible:ring-offset-0"
              style={{
                backdropFilter: 'blur(18.149999618530273px)',
                WebkitBackdropFilter: 'blur(18.149999618530273px)',
              }}
              aria-label="Close"
            >
              <CloseModalIcon />
            </DialogClose>
          </div>

          {/* Row 2: avatar + edit control, bottom-aligned */}
          <div className="flex min-h-0 flex-1 flex-row items-end justify-center gap-[6px] self-stretch px-4 pb-4 pt-2">
            <div className="relative size-[108.709px] shrink-0">
              <div
                className="size-full overflow-hidden ring-2 ring-white/80"
                role={profilePictureUrl ? 'img' : undefined}
                aria-label={profilePictureUrl ? 'Profile photo' : undefined}
                style={
                  profilePictureUrl
                    ? {
                        borderRadius: '108.709px',
                        ['--UI-Avatar' as string]: `url(${JSON.stringify(
                          profilePictureUrl
                        )}) lightgray 0px 0px / 100% 100% no-repeat`,
                        background: 'var(--UI-Avatar, lightgray)',
                      }
                    : {
                        borderRadius: '108.709px',
                        background: 'lightgray',
                      }
                }
              >
                {!profilePictureUrl && (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-medium text-[#171717]">
                    {(profile?.name || profile?.username)?.trim()
                      ? (profile.name || profile.username)!
                          .charAt(0)
                          .toUpperCase()
                      : '?'}
                  </div>
                )}
              </div>

              <label
                htmlFor="edit-profile-avatar-input"
                className={`absolute -bottom-2 -right-2 z-10 inline-flex cursor-pointer items-center justify-center gap-4 rounded-[100px] bg-[var(--Dark-Tint-20---Light-Steel,#DBDBDB)] p-2 transition-opacity ${
                  uploadingImage
                    ? 'pointer-events-none opacity-50'
                    : 'hover:opacity-90'
                }`}
                aria-label="Change profile photo"
              >
                <AvatarPencilIcon />
              </label>
              <input
                id="edit-profile-avatar-input"
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={uploadingImage || !profile}
                onChange={handleAvatarFileChange}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-4 px-6 py-4">
          <div className="space-y-2">
            <Label
              htmlFor="edit-about-email"
              className="label-small uppercase text-[#171717]"
            >
              Email
            </Label>
            <Input
              id="edit-about-email"
              type="email"
              readOnly
              autoComplete="email"
              value={profile?.email?.trim() ?? ''}
              placeholder="No email on file"
              aria-readonly="true"
              className={`${editFieldEmailClassName} cursor-default`}
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="edit-about-username"
              className="label-small uppercase text-[#171717]"
            >
              Username
            </Label>
            <Input
              id="edit-about-username"
              type="text"
              placeholder="Your username"
              maxLength={30}
              value={draft.username ?? ''}
              onChange={(e) =>
                setDraft((d) => ({ ...d, username: e.target.value }))
              }
              className={editFieldInputClassName}
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="edit-about-website"
              className="label-small uppercase text-[#171717]"
            >
              Website link
            </Label>
            <Input
              id="edit-about-website"
              type="text"
              placeholder="www.yourwebsite.com"
              value={draft.website ?? ''}
              onChange={(e) =>
                setDraft((d) => ({ ...d, website: e.target.value }))
              }
              className={editFieldInputClassName}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label
                htmlFor="edit-about-city"
                className="label-small uppercase text-[#171717]"
              >
                City
              </Label>
              <Input
                id="edit-about-city"
                type="text"
                placeholder="City"
                maxLength={120}
                value={draft.city ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, city: e.target.value }))
                }
                className={editFieldInputClassName}
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="edit-about-country"
                className="label-small uppercase text-[#171717]"
              >
                Country
              </Label>
              <Input
                id="edit-about-country"
                type="text"
                placeholder="Country"
                maxLength={120}
                value={draft.country ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, country: e.target.value }))
                }
                className={editFieldInputClassName}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="edit-about-bio"
              className="label-small uppercase text-[#171717]"
            >
              Bio
            </Label>
            <Textarea
              id="edit-about-bio"
              placeholder="A few words about you"
              maxLength={500}
              rows={4}
              value={draft.bio ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
              className={editFieldTextareaClassName}
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="edit-about-x"
              className="label-small uppercase text-[#171717]"
            >
              X
            </Label>
            <Input
              id="edit-about-x"
              type="text"
              placeholder="Your X handle"
              value={draft.twitter_handle ?? ''}
              onChange={(e) =>
                setDraft((d) => ({ ...d, twitter_handle: e.target.value }))
              }
              className={editFieldInputClassName}
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="edit-about-ig"
              className="label-small uppercase text-[#171717]"
            >
              Instagram
            </Label>
            <Input
              id="edit-about-ig"
              type="text"
              placeholder="Your Instagram handle"
              value={draft.instagram_handle ?? ''}
              onChange={(e) =>
                setDraft((d) => ({ ...d, instagram_handle: e.target.value }))
              }
              className={editFieldInputClassName}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-gray-100 px-6 py-4 sm:flex-row sm:justify-end">
          <div className="inline-flex w-full max-w-[361px] shrink-0 sm:ml-auto">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || !profile}
              className="label-large flex h-[44px] w-full cursor-pointer items-center justify-between bg-[#171717] py-2 pr-2 pl-4 text-[#ffffff] shadow-none transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50 uppercase"
            >
              <span className="whitespace-nowrap">
                {saving ? 'Saving…' : 'Save profile'}
              </span>
              <svg
                width={24}
                height={24}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0 invert"
                aria-hidden
              >
                <path
                  d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
                  fill="#171717"
                />
              </svg>
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
