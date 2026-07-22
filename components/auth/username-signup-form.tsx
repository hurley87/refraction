'use client';

import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

interface UsernameSignupFormProps {
  heading: string;
  headingClassName?: string;
  headingStyle?: CSSProperties;
  username: string;
  onUsernameChange: (value: string) => void;
  createPlayerError: string | null;
  isCreatingPlayer: boolean;
  onSubmit: () => void;
}

export function UsernameSignupForm({
  heading,
  headingClassName,
  headingStyle,
  username,
  onUsernameChange,
  createPlayerError,
  isCreatingPlayer,
  onSubmit,
}: UsernameSignupFormProps) {
  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <p
        className={cn(
          'text-center label-large tracking-[-0.5px] text-[#1a1a1a]',
          headingClassName
        )}
        style={headingStyle}
      >
        {heading}
      </p>

      <div className="flex w-full flex-col gap-1.5">
        <label
          htmlFor="signupUsername"
          className="text-[10px] font-medium uppercase tracking-[0.3px] text-[#999]"
        >
          Your Username <span className="text-red-500">*</span>
        </label>
        <input
          id="signupUsername"
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          className="w-full rounded-xl border border-[#e8e8e8] bg-white p-3 text-sm tracking-[-0.2px] text-[#1a1a1a] placeholder:text-[#c0c0c0] shadow-none focus:border-[#999] focus:outline-none focus:ring-0 disabled:opacity-50"
          maxLength={20}
          disabled={isCreatingPlayer}
          autoComplete="username"
        />
      </div>

      {createPlayerError && (
        <p
          className="text-center text-sm font-medium text-red-700"
          role="alert"
        >
          {createPlayerError}
        </p>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={!username.trim() || isCreatingPlayer}
        className="flex h-11 w-full items-center justify-between bg-black px-4 py-2 transition-colors hover:bg-[#171717] disabled:opacity-50"
      >
        <span className="label-medium label-large uppercase text-[#ffffff]">
          {isCreatingPlayer ? '...' : 'Start Earning'}
        </span>
        {!isCreatingPlayer && (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="block size-6 max-w-none"
            aria-hidden
          >
            <path
              d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
              fill="#DBDBDB"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
