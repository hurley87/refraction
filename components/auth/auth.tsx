'use client';

import { usePrivy } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useUsernameSignup } from '@/hooks/use-username-signup';
import { useEvmWalletAddress } from '@/hooks/use-evm-wallet-address';
import { UsernameSignupForm } from '@/components/auth/username-signup-form';

interface AuthProps {
  children: React.ReactNode;
}

export default function Auth({ children }: AuthProps) {
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
    checkEnabled: !!(ready && walletAddress),
    walletAddress,
    emailAddress: user?.email?.address,
  });

  if (!ready) {
    return (
      <div className="flex items-center justify-center text-center w-full min-h-dvh font-inktrap text-2xl">
        Loading...
      </div>
    );
  }

  if (ready && user && !user.email) {
    return (
      <div className="flex items-center justify-center w-full min-h-dvh px-4">
        <div className="w-full max-w-md text-center">
          <p className="text-xl font-inktrap mb-6">
            Link your email for updates
          </p>
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

  // Show username prompt after login (same shell as default AuthWrapper: funky hero background)
  if (ready && user && needsUsername) {
    return (
      <div
        className="font-grotesk flex min-h-dvh w-full flex-col items-center justify-center px-4 py-8"
        style={{
          background: "url('/bg-funky.png') no-repeat center center fixed",
          backgroundSize: 'cover',
        }}
      >
        <UsernameSignupForm
          heading="Choose your username to start earning points"
          headingClassName="text-foreground"
          username={username}
          onUsernameChange={setUsername}
          createPlayerError={createPlayerError}
          isCreatingPlayer={isCreatingPlayer}
          onSubmit={handleCreatePlayer}
        />
      </div>
    );
  }

  if (ready && !user) {
    return (
      <div className="font-grotesk flex flex-col max-w-xl mx-auto">
        <div className="flex flex-col items-start py-8 gap-8 flex-1 max-w-md mx-auto">
          {/* Main Title with Graphic */}
          <div className="relative w-full max-w-md flex items-center justify-center my-4 mx-auto">
            {/* Yellow Wireframe Box Graphic */}
            {/* Overlapping Title */}
            <h1 className=" flex items-center justify-center text-4xl md:text-5xl font-bold uppercase tracking-tight text-center font-inktrap z-10 my-6">
              {`Welcome to IRL`}
            </h1>
          </div>

          <div className="flex flex-col gap-1 w-full">
            {/* Call to Action Button */}
            <div className="w-full">
              <Button
                onClick={login}
                className="bg-white text-black  hover:bg-white/90 w-full font-inktrap py-6 text-base flex items-center justify-between px-6"
              >
                <span>Check-in</span>
                <Image
                  src="arrow-right.svg"
                  alt="arrow-right"
                  width={20}
                  height={20}
                />
              </Button>
            </div>

            {/* Spacer to push footer down */}
            <div className="w-full" />

            {/* Footer - Powered by Refraction */}
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

  return <>{children}</>;
}
