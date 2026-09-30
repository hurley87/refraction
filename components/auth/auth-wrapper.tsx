'use client';

import { usePrivy } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useUsernameSignup } from '@/hooks/use-username-signup';
import { useEvmWalletAddress } from '@/hooks/use-evm-wallet-address';
import { UsernameSignupForm } from '@/components/auth/username-signup-form';

export interface CheckpointCustomization {
  partnerImageUrl?: string;
  backgroundGradient?: string;
  fontFamily?: string;
  fontColor?: string;
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
const DEFAULT_LOGIN_CTA = 'Check In';
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
  const walletAddress = useEvmWalletAddress();
  const {
    username,
    setUsername,
    isCreatingPlayer,
    needsUsername,
    createPlayerError,
    handleCreatePlayer,
  } = useUsernameSignup({
    checkEnabled: !!(requireUsername && ready && walletAddress),
    walletAddress,
    emailAddress: user?.email?.address,
  });

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
        <UsernameSignupForm
          heading={usernameHeading}
          headingClassName={cn(
            !cp && unauthenticatedUI === 'map-onboarding' && 'text-[#171717]',
            !cp && unauthenticatedUI !== 'map-onboarding' && 'text-foreground'
          )}
          headingStyle={cp ? { color: checkpointText } : undefined}
          username={username}
          onUsernameChange={setUsername}
          createPlayerError={createPlayerError}
          isCreatingPlayer={isCreatingPlayer}
          onSubmit={handleCreatePlayer}
        />
      </div>
    );
  }

  // Unauthenticated UI
  if (ready && !user) {
    if (unauthenticatedUI === 'minimal') {
      return <>{children}</>;
    }

    // Map page: show the real map (children). Privy login then tour live in InteractiveMap.
    if (unauthenticatedUI !== 'map-onboarding') {
      // Default unauthenticated UI — if checkpoint customization is provided, use the branded layout
      if (checkpointCustomization) {
        const { partnerImageUrl, backgroundGradient, fontFamily, fontColor } =
          checkpointCustomization;

        const textColor = fontColor || '#E3FF30';
        const fontStyle = fontFamily ? { fontFamily } : undefined;
        const brandBg = extractBaseColorFromGradient(backgroundGradient || '');

        return (
          <div
            className="flex h-dvh w-full flex-col items-center overflow-hidden"
            style={{
              background: backgroundGradient || brandBg,
              ...fontStyle,
            }}
          >
            <div className="relative mx-auto flex h-full min-h-0 w-full max-w-[430px] flex-col px-4 py-4">
              {/* Native img so the file's own aspect ratio is kept. next/image would lock 208×260 and crop the sides. */}
              {partnerImageUrl && (
                <div className="flex min-h-0 w-full flex-1 items-center justify-center">
                  <img
                    src={partnerImageUrl}
                    alt={title}
                    className="max-h-full max-w-full rounded-lg object-contain"
                    style={{
                      boxShadow: '0px 0px 100px 30px rgba(255,255,255,1)',
                    }}
                  />
                </div>
              )}

              {/* Hero text content */}
              <div className="flex shrink-0 flex-col gap-4 pt-4 max-[740px]:gap-3 max-[740px]:pt-3">
                <h1
                  className="display0-sm text-center font-extrabold uppercase tracking-tighter"
                  style={{ color: textColor, ...fontStyle }}
                >
                  {title}
                </h1>
                {description && (
                  <p
                    className="text-base font-medium leading-snug -tracking-[0.02em] sm:text-xl sm:leading-[1.2]"
                    style={{ color: textColor }}
                  >
                    {description}
                  </p>
                )}

                <button
                  onClick={login}
                  className="w-full label-large py-3 px-4 flex items-center justify-between  uppercase"
                  style={{
                    backgroundColor: textColor,
                    color: brandBg,
                  }}
                >
                  <span>{loginCtaText}</span>
                  <svg
                    width={20}
                    height={20}
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="shrink-0"
                    aria-hidden
                  >
                    <path
                      d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </div>
            </div>
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
                  className="bg-white text-black  hover:bg-white/90 w-full label-medium py-6 text-base flex items-center justify-between px-6"
                >
                  <span>{loginCtaText}</span>
                  <Image
                    src="arrow-right.svg"
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
  }

  // Authenticated or map pre-login — render children
  if (unauthenticatedUI === 'map-onboarding') {
    return <div className="h-screen w-full relative">{children}</div>;
  }

  return <>{children}</>;
}
