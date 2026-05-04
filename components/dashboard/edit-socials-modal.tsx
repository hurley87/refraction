'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { UserProfile } from '@/lib/types';
import { invalidateProfileRelatedQueries } from '@/lib/invalidate-profile-queries';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

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

const inputClass =
  'body-large h-10 rounded-full border border-gray-300 bg-white px-4 text-black placeholder:text-gray-500 focus-visible:border-[#313131] focus-visible:ring-2 focus-visible:ring-[#FFE600]';

const textareaClass =
  'body-large min-h-[100px] w-full resize-y rounded-2xl border border-gray-300 bg-white px-4 py-3 text-black placeholder:text-gray-500 focus-visible:border-[#313131] focus-visible:ring-2 focus-visible:ring-[#FFE600]';

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

export default function EditSocialsModal({
  open,
  onOpenChange,
  profile,
}: EditSocialsModalProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<AboutYouDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && profile) {
      setDraft(draftFromProfile(profile));
    }
  }, [open, profile]);

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
        className="max-h-[90vh] max-w-md gap-0 overflow-y-auto border border-gray-200 bg-white p-0 font-grotesk sm:rounded-3xl"
        overlayClassName="bg-black/60 backdrop-blur-sm"
      >
        <div className="border-b border-gray-100 px-6 pb-4 pt-6">
          <DialogHeader>
            <DialogTitle className="title3 text-left text-[#171717]">
              Edit profile
            </DialogTitle>
            <DialogDescription className="text-left text-[#757575]">
              Username, location, bio, website, and social handles on your
              dashboard.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex flex-col gap-4 px-6 py-4">
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
              className={inputClass}
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
              className={inputClass}
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
                className={inputClass}
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
                className={inputClass}
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
              className={textareaClass}
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
              className={inputClass}
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
              className={inputClass}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-gray-100 px-6 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="rounded-full"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !profile}
            className="rounded-full bg-[#171717] text-white hover:bg-[#313131]"
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
