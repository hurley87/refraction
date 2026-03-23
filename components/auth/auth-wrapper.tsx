'use client';

import { usePrivy } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import Image from 'next/image';

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
      <div className="flex items-center justify-center text-center w-full min-h-dvh font-inktrap text-2xl">
        Loading...
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

  // Username requirement check
  if (requireUsername && ready && user && needsUsername) {
    return (
      <div className="flex flex-col gap-6 w-full justify-center max-w-xl mx-auto min-h-dvh px-4 py-8">
        <div className="flex flex-col gap-6">
          <p className="text-lg font-inktrap text-center">{usernameHeading}</p>

          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
            <p className="text-sm mb-3 font-inktrap uppercase">
              ENTER YOUR USERNAME
            </p>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-white/90 border-0 rounded-full pl-4 pr-4 py-3 text-black placeholder:text-gray-500 font-inktrap focus:outline-none focus:bg-white"
              maxLength={20}
              disabled={isCreatingPlayer}
            />
          </div>

          <Button
            className="w-full bg-white text-black rounded-full hover:bg-white/90 font-inktrap py-6 text-base flex items-center justify-center px-6 disabled:opacity-50 uppercase"
            onClick={handleCreatePlayer}
            disabled={!username.trim() || isCreatingPlayer}
          >
            {isCreatingPlayer ? 'CREATING PLAYER...' : 'START EARNING'}
            {!isCreatingPlayer && (
              <svg
                className="w-4 h-4 ml-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
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
        <div
          className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden"
          style={{
            backgroundImage: "url('/bg-green.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="w-full max-w-md mx-auto flex flex-col items-center justify-between h-fit py-6 sm:py-8 gap-6">
            {/* Map Screenshot */}
            <div className="rounded-[26px] overflow-hidden w-full h-[calc(100vh-320px)] max-h-[400px] min-h-[320px]">
              <img
                src="/map-onboarding.png"
                alt="IRL Map showing local spots to explore and check in"
                className="h-full w-full object-cover object-top"
                loading="lazy"
              />
            </div>

            <p className="text-white text-[14px] sm:text-[16px] leading-[20px] sm:leading-[22px] tracking-[-0.36px] sm:tracking-[-0.48px] text-left w-full px-2">
              IRL Maps are curated by locals shaping the scene.
              <br />
              Click on a location to check in and earn points for future rewards at clubs, bars and galleries in your city.
            </p>

            <button
              onClick={login}
              className="bg-white flex h-12 items-center justify-between px-4 py-2 rounded-full w-full cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <span className="font-pleasure font-medium text-[16px] leading-[16px] text-[#313131] tracking-[-1.28px]">
                {loginCtaText}
              </span>
              <img src="/arrow-right.svg" alt="" className="w-6 h-6" />
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
      const brandBg = backgroundGradient
        ? extractBaseColorFromGradient(backgroundGradient)
        : '#C199C4';

      return (
        <div className="min-h-dvh w-full flex flex-col" style={fontStyle}>
          {/* Hero Section */}
          <div
            className="relative w-full flex-shrink-0"
            style={{
              minHeight: '85vh',
              backgroundColor: brandBg,
            }}
          >
            {/* Partner background image */}
            {partnerImageUrl && (
              <div className="absolute inset-0">
                <Image
                  src={partnerImageUrl}
                  alt={title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            )}

            {/* Gradient overlay */}
            {backgroundGradient && (
              <div
                className="absolute inset-0"
                style={{ background: backgroundGradient }}
              />
            )}

            {/* Glass header */}
            <div className="absolute top-2 left-2 right-2 z-20">
              <div
                className="rounded-[26px] px-4 py-2 flex items-center justify-between"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,1) 100%)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  boxShadow: 'inset 0px 4px 8px 0px rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(64px)',
                }}
              >
                <Image
                  src="/irlfooterlogo.svg"
                  alt="IRL"
                  width={40}
                  height={40}
                  className="rounded-full"
                />
                <button
                  onClick={login}
                  className="px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider"
                  style={{
                    background: 'rgba(255,255,255,0.25)',
                    color: '#131313',
                  }}
                >
                  Sign Up
                </button>
              </div>
            </div>

            {/* Poster image (centered over hero) */}
            {partnerImageUrl && (
              <div className="absolute inset-x-0 top-16 flex justify-center z-10 pointer-events-none">
                <div
                  className="rounded-lg overflow-hidden"
                  style={{
                    boxShadow: '0px 0px 100px 30px rgba(255,255,255,1)',
                    width: 208,
                    height: 209,
                  }}
                >
                  <Image
                    src={partnerImageUrl}
                    alt={title}
                    width={208}
                    height={209}
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
            )}

            {/* Hero text content */}
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-8 z-10">
              <div className="flex flex-col items-center gap-6">
                <div className="flex flex-col items-center gap-4 w-full">
                  <h1
                    className="text-[52px] leading-[0.81em] font-extrabold uppercase tracking-tighter text-left w-full"
                    style={{ color: textColor, ...fontStyle }}
                  >
                    {title}
                  </h1>
                  {description && (
                    <p
                      className="text-xl leading-[1.2] font-medium w-full -tracking-[0.02em]"
                      style={{ color: textColor }}
                    >
                      {description}
                    </p>
                  )}
                </div>

                <div className="w-full flex flex-col gap-4">
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

                {/* Powered by logos */}
                <div className="flex items-center gap-4">
                  <span
                    className="text-xs font-medium uppercase tracking-wider"
                    style={{ color: textColor }}
                  >
                    Powered by
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer / "Get Involved" Section */}
          {(footerTitle || footerDescription) && (
            <div
              className="relative w-full min-h-[80vh] flex flex-col justify-center"
              style={{ backgroundColor: brandBg }}
            >
              {/* Optional background image with color overlay */}
              {partnerImageUrl && (
                <div className="absolute inset-0">
                  <Image
                    src={partnerImageUrl}
                    alt=""
                    fill
                    className="object-cover opacity-40"
                  />
                </div>
              )}

              {/* Top gradient fade */}
              <div
                className="absolute inset-x-0 top-0 h-28"
                style={{
                  background: backgroundGradient
                    ? backgroundGradient
                    : `linear-gradient(180deg, ${brandBg} 0%, transparent 100%)`,
                }}
              />

              <div className="relative z-10 px-4 py-16 flex flex-col gap-8">
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
              </div>

              {/* IRL logo at bottom */}
              <div className="absolute bottom-8 inset-x-0 flex justify-center">
                <Image
                  src="/irlfooterlogo.svg"
                  alt="IRL"
                  width={72}
                  height={72}
                  className="rounded-full opacity-80"
                />
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

            <div className="flex items-center justify-between w-full">
              <p className="text-xs uppercase tracking-wider font-inktrap opacity-80">
                POWERED BY
              </p>
              <p className="text-lg font-bold font-inktrap">REFRACTION</p>
            </div>
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
