'use client';

import { usePrivy } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  FIRST_CHECKIN_NUDGE_PENDING_KEY,
  FIRST_CHECKIN_NUDGE_SNOOZE_UNTIL_KEY,
} from '@/lib/first-checkin-nudge';

export interface CheckpointCustomization {
  partnerImageUrl?: string;
  backgroundGradient?: string;
  fontFamily?: string;
  fontColor?: string;
  footerTitle?: string;
  footerDescription?: string;
}

interface AuthWrapperProps {
  children: React.ReactNode;
  requireUsername?: boolean;
  requireEmail?: boolean;
  unauthenticatedUI?: 'default' | 'map-onboarding' | 'minimal';
  /** Optional checkpoint/location name shown on auth gates (e.g. /c/[id]) */
  authContextName?: string | null;
  /** Optional checkpoint/location description shown on auth gates */
  authContextDescription?: string | null;
  /** Optional custom login CTA button label (e.g. /c/[id]); leave blank for default */
  authContextLoginCtaText?: string | null;
  /** CMS-driven page customization for /c/[id] pages */
  checkpointCustomization?: CheckpointCustomization;
}

function extractBaseColorFromGradient(gradient: string): string {
  const match = gradient.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  return '#C199C4';
}

const DEFAULT_AUTH_TITLE = 'Welcome to IRL';
const DEFAULT_LOGIN_CTA = 'Find spots nearby';
const MINIMAL_LOGIN_CTA = 'Get Started';
const DEFAULT_EMAIL_HEADING = 'Link your email for updates';
const DEFAULT_USERNAME_HEADING = 'Choose your username to start earning points';

export default function AuthWrapper({
  children,
  requireUsername = false,
  requireEmail = false,
  unauthenticatedUI = 'default',
  authContextName,
  authContextDescription,
  authContextLoginCtaText,
  checkpointCustomization,
}: AuthWrapperProps) {
  const title = authContextName?.trim() || DEFAULT_AUTH_TITLE;
  const description = authContextDescription?.trim() || null;
  const loginCtaText =
    authContextLoginCtaText?.trim() ||
    (unauthenticatedUI === 'minimal' ? MINIMAL_LOGIN_CTA : DEFAULT_LOGIN_CTA);
  const emailHeading = authContextName?.trim()
    ? `Link your email for updates at ${authContextName.trim()}`
    : DEFAULT_EMAIL_HEADING;
  const usernameHeading = authContextName?.trim()
    ? `Choose your username to check in at ${authContextName.trim()}`
    : DEFAULT_USERNAME_HEADING;
  const { user, ready, linkEmail, login } = usePrivy();
  const [username, setUsername] = useState('');
  const [isCreatingPlayer, setIsCreatingPlayer] = useState(false);
  const [needsUsername, setNeedsUsername] = useState(false);

  useEffect(() => {
    if (!requireUsername || !ready || !user?.wallet?.address) return;

    const walletAddress = user.wallet.address;
    const checkPlayerData = async () => {
      try {
        const response = await fetch(
          `/api/player?walletAddress=${encodeURIComponent(walletAddress)}`
        );

        if (response.ok) {
          const responseData = await response.json();
          const result = responseData.data || responseData;
          const existingPlayer = result.player;

          if (existingPlayer && !existingPlayer.username) {
            setNeedsUsername(true);
          }
        } else if (response.status === 404) {
          setNeedsUsername(true);
        }
      } catch (error) {
        console.error('Error checking player data:', error);
        setNeedsUsername(true);
      }
    };

    checkPlayerData();
  }, [ready, user?.wallet?.address, requireUsername]);

  const handleCreatePlayer = async () => {
    if (!username.trim() || !user?.wallet?.address) return;

    const walletAddress = user.wallet.address;
    setIsCreatingPlayer(true);
    try {
      const response = await fetch('/api/player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          email: user.email?.address || '',
          username: username.trim(),
        }),
      });

      const responseData = await response.json();

      if (responseData.success) {
        setNeedsUsername(false);
        if (typeof window !== 'undefined' && walletAddress) {
          const normalized = walletAddress.toLowerCase();
          window.localStorage.setItem(
            FIRST_CHECKIN_NUDGE_PENDING_KEY,
            normalized
          );
          window.localStorage.removeItem(FIRST_CHECKIN_NUDGE_SNOOZE_UNTIL_KEY);
        }
      } else {
        console.error('Failed to create player:', responseData.error);
      }
    } catch (error) {
      console.error('Error creating player:', error);
    } finally {
      setIsCreatingPlayer(false);
    }
  };

  // Loading state
  if (!ready) {
    return (
      <div className="bg-[#fff200] text-[#171717] display0 flex items-center justify-center text-center w-full min-h-dvh uppercase">
        Loading
      </div>
    );
  }

  // Email requirement check
  if (requireEmail && ready && user && !user.email) {
    return (
      <div className="flex items-center justify-center w-full min-h-dvh px-4">
        <div className="w-full max-w-md text-center">
          <p className="text-xl font-inktrap mb-6">{emailHeading}</p>
          <Button
            className="w-full bg-white text-black rounded-full hover:bg-white/90 text-base font-inktrap py-6 flex items-center justify-center px-6"
            onClick={linkEmail}
            aria-label="Link your email"
          >
            Link Email
          </Button>
        </div>
      </div>
    );
  }

  // Username requirement check — match surrounding auth shells so the form is not white-on-white
  if (requireUsername && ready && user && needsUsername) {
    const cp = checkpointCustomization;
    const checkpointBg =
      cp?.backgroundGradient ||
      extractBaseColorFromGradient(cp?.backgroundGradient ?? '');
    const checkpointText = cp?.fontColor || '#E3FF30';

    return (
      <div
        className={cn(
          'w-full min-h-dvh flex flex-col items-center justify-center px-4 py-8 sm:px-6',
          !cp && unauthenticatedUI === 'map-onboarding' && 'overflow-hidden',
          !cp && unauthenticatedUI !== 'map-onboarding' && 'font-grotesk'
        )}
        style={
          cp
            ? {
                background: checkpointBg,
                ...(cp.fontFamily ? { fontFamily: cp.fontFamily } : {}),
              }
            : unauthenticatedUI === 'map-onboarding'
              ? {
                  backgroundColor: '#E3FF30',
                }
              : {
                  background:
                    "url('/bg-funky.png') no-repeat center center fixed",
                  backgroundSize: 'cover',
                }
        }
      >
        <div className="flex w-full max-w-md flex-col gap-6">
          <p
            className={cn(
              'text-center text-lg font-semibold tracking-tight font-inktrap md:text-xl',
              !cp && unauthenticatedUI === 'map-onboarding' && 'text-[#171717]',
              !cp && unauthenticatedUI !== 'map-onboarding' && 'text-foreground'
            )}
            style={cp ? { color: checkpointText } : undefined}
          >
            {usernameHeading}
          </p>

          <div className="rounded-2xl border border-white/30 bg-white/20 p-4 backdrop-blur-sm">
            <p className="mb-3 text-sm font-inktrap uppercase text-foreground">
              ENTER YOUR USERNAME
            </p>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-full border border-border/60 bg-white py-3 pl-4 pr-4 font-inktrap text-foreground placeholder:text-muted-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
              maxLength={20}
              disabled={isCreatingPlayer}
              autoComplete="username"
            />
          </div>

          <Button
            className="flex w-full items-center justify-center rounded-full bg-white px-6 py-6 text-base font-inktrap uppercase text-black hover:bg-white/90 disabled:opacity-50"
            onClick={handleCreatePlayer}
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
      </div>
    );
  }

  // Unauthenticated UI
  if (ready && !user) {
    if (unauthenticatedUI === 'minimal') {
      return <>{children}</>;
    }

    if (unauthenticatedUI === 'map-onboarding') {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#FFE600] p-4 sm:p-6 overflow-hidden">
          <div className="w-full max-w-md mx-auto flex flex-col items-center justify-between h-fit py-6 sm:py-8 gap-6">
            {/* Map Screenshot */}
            <div className="rounded-[26px] overflow-hidden w-full h-[calc(100vh-320px)] max-h-[400px] min-h-[320px]">
              <img
                src="map/map-onboarding.png"
                alt="IRL Map showing local spots to explore and check in"
                className="h-full w-full object-cover object-top"
                loading="lazy"
              />
            </div>

            <p className="text-[#171717] text-[14px] sm:text-[16px] leading-[20px] sm:leading-[22px] tracking-[-0.36px] sm:tracking-[-0.48px] text-left w-full px-2">
              IRL Maps are curated by locals shaping the scene.
              <br />
              Click on a location to check in and earn points for future rewards
              at clubs, bars and galleries in your city.
            </p>

            <button
              onClick={login}
              className="bg-black flex h-12 items-center justify-between px-4 py-2 rounded-full w-full cursor-pointer hover:bg-neutral-900 transition-colors"
            >
              <span className="label-medium label-large uppercase text-white">
                {loginCtaText}
              </span>
              <svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="size-5 shrink-0"
                aria-hidden
              >
                <path
                  d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
                  fill="#ffffff"
                />
              </svg>
            </button>
          </div>
        </div>
      );
    }

    // Default unauthenticated UI — if checkpoint customization is provided, use the branded layout
    if (checkpointCustomization) {
      const {
        partnerImageUrl,
        backgroundGradient,
        fontFamily,
        fontColor,
        footerTitle,
        footerDescription,
      } = checkpointCustomization;

      const textColor = fontColor || '#E3FF30';
      const fontStyle = fontFamily ? { fontFamily } : undefined;
      const brandBg = extractBaseColorFromGradient(backgroundGradient || '');

      return (
        <div
          className="min-h-dvh w-full flex flex-col items-center"
          style={{
            background: backgroundGradient || brandBg,
            ...fontStyle,
          }}
        >
          <div className="relative w-full max-w-[430px] mx-auto flex flex-col min-h-dvh px-4">
            {/* Poster image (centered) */}
            {partnerImageUrl && (
              <div className="flex justify-center mt-6 mb-10">
                <div
                  className="rounded-lg overflow-hidden"
                  style={{
                    boxShadow: '0px 0px 100px 30px rgba(255,255,255,1)',
                    width: 208,
                    height: 260,
                  }}
                >
                  <Image
                    src={partnerImageUrl}
                    alt={title}
                    width={208}
                    height={260}
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
            )}

            {/* Hero text content */}
            <div className="flex flex-col gap-6 pb-8">
              <h1
                className="text-[52px] leading-[0.81em] font-extrabold uppercase tracking-tighter text-left"
                style={{ color: textColor, ...fontStyle }}
              >
                {title}
              </h1>
              {description && (
                <p
                  className="text-xl leading-[1.2] font-medium -tracking-[0.02em]"
                  style={{ color: textColor }}
                >
                  {description}
                </p>
              )}

              <button
                onClick={login}
                className="w-full rounded-full py-3 px-4 flex items-center justify-between text-xl font-bold uppercase -tracking-[0.08em]"
                style={{
                  backgroundColor: textColor,
                  color: brandBg,
                }}
              >
                <span>{loginCtaText}</span>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Footer / "Get Involved" Section */}
          {(footerTitle || footerDescription) && (
            <div
              className="w-full flex flex-col items-center"
              style={{ backgroundColor: brandBg }}
            >
              <div className="w-full max-w-[430px] mx-auto px-4 py-16 flex flex-col gap-8">
                {footerTitle && (
                  <h2
                    className="text-[30px] leading-[1em] font-extrabold uppercase -tracking-[0.03em]"
                    style={{ color: textColor, ...fontStyle }}
                  >
                    {footerTitle}
                  </h2>
                )}
                {footerDescription && (
                  <p
                    className="text-xl leading-[1.2] font-medium -tracking-[0.02em]"
                    style={{ color: textColor }}
                  >
                    {footerDescription}
                  </p>
                )}

                <button
                  onClick={login}
                  className="w-full rounded-full py-5 px-6 text-center text-xl font-bold uppercase -tracking-[0.08em]"
                  style={{
                    backgroundColor: textColor,
                    color: brandBg,
                  }}
                >
                  Explore The IRL Map
                </button>

                <div className="flex justify-center pt-8">
                  <Image
                    src="/irlfooterlogo.svg"
                    alt="IRL"
                    width={72}
                    height={72}
                    className="rounded-full opacity-80"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Fallback default unauthenticated UI (non-checkpoint pages)
    return (
      <div className="font-grotesk flex flex-col max-w-xl mx-auto">
        <div
          className="flex min-h-dvh flex-col items-start py-8 gap-8 flex-1 max-w-md mx-auto p-4"
          style={{
            background: "url('/bg-funky.png') no-repeat center center fixed",
            backgroundSize: 'cover',
          }}
        >
          <div className="relative w-full max-w-md flex flex-col items-center justify-center my-4 mx-auto gap-3">
            <h1 className="flex items-center justify-center text-4xl md:text-5xl font-bold uppercase tracking-tight text-center font-inktrap z-10 my-6 break-words line-clamp-4">
              {title}
            </h1>
            {description && (
              <p className="text-center text-base md:text-lg opacity-90 max-w-md">
                {description}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1 w-full">
            <div className="w-full">
              <Button
                onClick={login}
                className="bg-white text-black rounded-full hover:bg-white/90 w-full font-inktrap py-6 text-base flex items-center justify-between px-6"
              >
                <span>{loginCtaText}</span>
                <Image
                  src="/home/arrow-right.svg"
                  alt="arrow-right"
                  width={20}
                  height={20}
                />
              </Button>
            </div>

            <div className="w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Authenticated - render children
  if (unauthenticatedUI === 'map-onboarding') {
    return <div className="h-screen w-full relative">{children}</div>;
  }

  return <>{children}</>;
}
