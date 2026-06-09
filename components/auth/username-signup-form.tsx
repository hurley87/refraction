'use client';

import type { CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
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
          'text-center text-lg font-semibold tracking-tight font-inktrap md:text-xl',
          headingClassName
        )}
        style={headingStyle}
      >
        {heading}
      </p>

      <div className="rounded-2xl border border-white/30 bg-white/20 p-4 backdrop-blur-sm">
        <p className="mb-3 text-sm font-inktrap uppercase text-foreground">
          ENTER YOUR USERNAME
        </p>
        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          className="w-full rounded-full border border-border/60 bg-white py-3 pl-4 pr-4 font-inktrap text-foreground placeholder:text-muted-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
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

      <Button
        className="flex w-full items-center justify-center rounded-full bg-white px-6 py-6 text-base font-inktrap uppercase text-black hover:bg-white/90 disabled:opacity-50"
        onClick={onSubmit}
        disabled={!username.trim() || isCreatingPlayer}
      >
        {isCreatingPlayer ? 'CREATING PLAYER...' : 'START EARNING'}
        {!isCreatingPlayer && (
          <svg
            className="ml-2 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        )}
      </Button>
    </div>
  );
}
