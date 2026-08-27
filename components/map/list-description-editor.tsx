'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { MAX_PLAYER_LIST_DESCRIPTION_LENGTH } from '@/lib/constants';

interface ListDescriptionEditorProps {
  description: string | null | undefined;
  isSaving: boolean;
  onSave: (description: string | null) => Promise<void> | void;
}

/**
 * Owner-only add/edit control for a custom list description.
 */
export function ListDescriptionEditor({
  description,
  isSaving,
  onSave,
}: ListDescriptionEditorProps) {
  const savedDescription = description?.trim() ?? '';
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(savedDescription);

  useEffect(() => {
    setIsEditing(false);
    setDraft(savedDescription);
  }, [savedDescription]);

  const handleCancel = () => {
    setDraft(savedDescription);
    setIsEditing(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving) return;
    const next = draft.trim() || null;
    if (next === (savedDescription || null)) {
      setIsEditing(false);
      return;
    }
    try {
      await onSave(next);
      setIsEditing(false);
    } catch {
      // The update hook already toasts; stay in edit mode so the draft is kept.
    }
  };

  if (isEditing) {
    return (
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <label className="block">
          <span className="label-small uppercase tracking-wide text-[#757575]">
            Description
          </span>
          <textarea
            value={draft}
            maxLength={MAX_PLAYER_LIST_DESCRIPTION_LENGTH}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="What is this collection about?"
            rows={3}
            autoFocus
            disabled={isSaving}
            className="mt-1 w-full resize-none rounded-none border border-neutral-300 bg-white px-3 py-2 text-sm text-[#171717] focus:border-[var(--Borders-Heavy-Border,#454545)] focus:shadow-[0_0_0_2px_#FFE600] focus:outline-none disabled:opacity-60"
          />
        </label>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={isSaving}
            className="label-medium flex h-8 items-center gap-2 bg-[#171717] px-3 uppercase tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            Save
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="label-medium h-8 border border-[#DBDBDB] px-3 uppercase tracking-wide text-[#757575] transition-colors hover:bg-neutral-50 disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {savedDescription ? (
        <p className="body-small whitespace-pre-wrap text-[#757575]">
          {savedDescription}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="label-small uppercase tracking-wide text-[#171717] underline-offset-2 hover:underline"
      >
        {savedDescription ? 'Edit description' : 'Add description'}
      </button>
    </div>
  );
}
