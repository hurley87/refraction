'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { MAX_PLAYER_LIST_TITLE_LENGTH } from '@/lib/constants';

interface ListTitleEditorProps {
  title: string;
  isSaving: boolean;
  onSave: (title: string) => Promise<void> | void;
}

/**
 * Owner-only rename control for a custom list title in the expanded detail view.
 */
export function ListTitleEditor({
  title,
  isSaving,
  onSave,
}: ListTitleEditorProps) {
  const savedTitle = title.trim();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(savedTitle);

  useEffect(() => {
    setIsEditing(false);
    setDraft(savedTitle);
  }, [savedTitle]);

  const handleCancel = () => {
    setDraft(savedTitle);
    setIsEditing(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving) return;
    const next = draft.trim();
    if (!next) return;
    if (next === savedTitle) {
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
        className="flex min-w-0 flex-col gap-2"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <label className="block min-w-0">
          <span className="sr-only">List name</span>
          <input
            type="text"
            value={draft}
            maxLength={MAX_PLAYER_LIST_TITLE_LENGTH}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="List name"
            autoFocus
            disabled={isSaving}
            className="title4 w-full rounded-none border border-neutral-300 bg-white px-2 py-1 text-[#171717] focus:border-[var(--Borders-Heavy-Border,#454545)] focus:shadow-[0_0_0_2px_#FFE600] focus:outline-none disabled:opacity-60 mapHd:text-[42px] mapHd:font-medium mapHd:leading-[40px]"
          />
        </label>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={isSaving || draft.trim().length === 0}
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
    <div className="flex min-w-0 flex-col items-start gap-1">
      <h2 className="title4 line-clamp-2 text-[#171717] mapHd:text-[42px] mapHd:font-medium mapHd:leading-[40px]">
        {savedTitle}
      </h2>
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="label-small uppercase tracking-wide text-[#171717] underline-offset-2 hover:underline"
      >
        Rename
      </button>
    </div>
  );
}
