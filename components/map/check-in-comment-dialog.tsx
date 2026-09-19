'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type CheckInCommentDialogProps = {
  open: boolean;
  comment: string;
  isCheckingIn: boolean;
  onCommentChange: (value: string) => void;
  onSubmit: () => void;
  onOpenChange: (open: boolean) => void;
  overlayClassName: string;
  shellClassName: string;
  panelClassName: string;
};

export function CheckInCommentDialog({
  open,
  comment,
  isCheckingIn,
  onCommentChange,
  onSubmit,
  onOpenChange,
  overlayClassName,
  shellClassName,
  panelClassName,
}: CheckInCommentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        overlayClassName={overlayClassName}
        className={shellClassName}
      >
        <div
          className={cn(panelClassName, 'xl:items-stretch xl:justify-start')}
        >
          <div className="flex w-full items-center justify-between border-b border-[#f0f0f0] bg-white px-4 py-3">
            <h3 className="label-large tracking-[-0.5px] text-[#1a1a1a]">
              Check-In
            </h3>
            <button
              onClick={() => onOpenChange(false)}
              className="text-[#999] transition-colors hover:text-[#666]"
              aria-label="Close comment modal"
              type="button"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="flex w-full flex-1 flex-col self-stretch overflow-y-auto p-4">
            <div className="flex w-full flex-col gap-1.5">
              <label
                htmlFor="checkInComment"
                className="text-[10px] font-medium uppercase tracking-[0.3px] text-[#999]"
              >
                Your Comment <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="checkInComment"
                value={comment}
                onChange={(e) => onCommentChange(e.target.value)}
                placeholder="Share why this place is worth visiting..."
                className="min-h-[140px] rounded-xl border border-[#e8e8e8] bg-white p-3 text-sm tracking-[-0.2px] text-[#1a1a1a] placeholder:text-[#c0c0c0] resize-none focus-visible:border-[#999] focus-visible:ring-0 focus-visible:ring-offset-0"
                maxLength={500}
                disabled={isCheckingIn}
              />
            </div>
          </div>

          <div className="sticky bottom-0 z-20 w-full border-t border-[#DBDBDB] bg-white p-4 pt-3">
            <div className="flex w-full gap-2">
              <button
                onClick={() => onOpenChange(false)}
                className="flex h-11 flex-1 items-center justify-between bg-[var(--Dark-Tint-100---Ink-Black,#757575)] px-4 py-2 transition-colors hover:bg-black disabled:opacity-50"
                disabled={isCheckingIn}
                type="button"
              >
                <span className="label-medium label-large uppercase text-[#ffffff]">
                  Cancel
                </span>
              </button>
              <button
                onClick={onSubmit}
                disabled={isCheckingIn || !comment.trim()}
                className="flex h-11 flex-1 items-center justify-between bg-black px-4 py-2 transition-colors  disabled:opacity-50"
                type="button"
              >
                <span className="label-medium label-large uppercase text-[#ffffff]">
                  {isCheckingIn ? '...' : 'Submit'}
                </span>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="block size-6 max-w-none"
                  aria-hidden="true"
                >
                  <path
                    d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
                    fill="#DBDBDB"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
